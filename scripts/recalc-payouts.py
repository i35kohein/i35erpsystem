#!/usr/bin/env python3
"""Recalc technician payout records using the NEW commission base
(profit AFTER parts cost = Amount Due − Parts Cost, Ko Hein 2026-08-11).

Old records were computed as laborRevenue × rate. This script recomputes each
payout from the actual paid Finished/Taken Out work orders of the technician
in the payout period.

Usage:
  python3 scripts/recalc-payouts.py --dry    # show what would change
  python3 scripts/recalc-payouts.py           # apply (writes via Supabase REST)
"""
import json, os, sys, urllib.request, urllib.error

PUB = os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
URL = os.environ.get('VITE_SUPABASE_URL', '')
if not PUB or not URL:
    with open(os.path.join(os.path.dirname(__file__), '..', '.env.local')) as f:
        for line in f:
            line = line.strip()
            if line.startswith('VITE_SUPABASE_PUBLISHABLE_KEY='):
                PUB = line.split('=', 1)[1]
            elif line.startswith('VITE_SUPABASE_URL='):
                URL = line.split('=', 1)[1]

ENDPOINT = f"{URL}/rest/v1/erp_records"
HEADERS = {"apikey": PUB, "Authorization": f"Bearer {PUB}", "Content-Type": "application/json"}

def api(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None

def fetch_all(collection):
    rows, offset = [], 0
    while True:
        page = api('GET', f"{ENDPOINT}?select=data&collection_name=eq.{collection}&limit=100&offset={offset}")
        rows.extend(page)
        if len(page) < 100:
            break
        offset += 100
    return rows

def labor_revenue(wo):
    total = 0
    for li in wo.get('lineItems', []):
        if not li.get('isLabor'):
            continue
        line_total = (li.get('unitPrice') or 0) * (li.get('quantity') or 1)
        disc = li.get('lineItemDiscountPercent') or 0
        if disc:
            line_total -= round(line_total * disc / 100)
        total += line_total
    return total

def parts_cost(wo):
    # Ko Hein 2026-08-11: parts deduction uses SELLING price (repair price
    # list already includes parts). Stock/expense bookkeeping still uses cost.
    return sum(
        (li.get('unitPrice') or 0) * (li.get('quantity') or 1)
        for li in wo.get('lineItems', [])
        if not li.get('isLabor')
    )

def repair_type(wo):
    if wo.get('repairTypeAI'):
        return wo['repairTypeAI']
    return 'hardware' if wo.get('serviceType') == 'Micro-Soldering' else 'spareparts'

def commission_base(wo):
    total = wo.get('totalAmount') or wo.get('subtotal') or 0
    return max(0, total - parts_cost(wo))

def main():
    dry = '--dry' in sys.argv
    payouts = fetch_all('technicianPayouts')
    work_orders = fetch_all('workOrders')
    technicians = fetch_all('technicians')
    tech_by_id = {t['data'].get('id'): t['data'] for t in technicians}
    print(f"Payouts: {len(payouts)} | WorkOrders: {len(work_orders)} | Technicians: {len(technicians)}")

    backup_path = os.path.join(os.path.dirname(__file__), '..', '..', 'mpsd', 'db', f'payouts-backup-{__import__("time").strftime("%Y%m%d-%H%M%S")}.json')
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    with open(backup_path, 'w') as f:
        json.dump(payouts, f, indent=1)
    print(f"Backup → {backup_path}")

    # Group existing payouts by (technicianId, period) so missing ones can be
    # detected and created (Ko Hein 2026-08-11).
    existing_keys = {(d.get('technicianId'), d.get('period')) for d in (p.get('data', {}) for p in payouts)}
    changed = 0
    created = 0

    # Aggregate tickets per (technicianId, period): PAID (checked out) only.
    from collections import defaultdict
    agg = defaultdict(lambda: {'tickets': [], 'labor': 0, 'parts': 0})
    for r in work_orders:
        wo = r.get('data', {})
        if wo.get('status') not in ('Finished', 'Taken Out'):
            continue
        if not (wo.get('isPaid') or (wo.get('paidAmount') or 0) > 0):
            continue
        tech_id = wo.get('assignedTechId')
        if not tech_id:
            continue
        completed = wo.get('completedAt') or wo.get('updatedAt') or wo.get('createdAt') or ''
        period = completed[:7]  # YYYY-MM
        agg[(tech_id, period)]['tickets'].append(wo)
        agg[(tech_id, period)]['labor'] += labor_revenue(wo)
        agg[(tech_id, period)]['parts'] += parts_cost(wo)

    # 1) Update existing payout records.
    for p in payouts:
        d = p.get('data', {})
        tech_id = d.get('technicianId')
        period = d.get('period', '')
        if not tech_id or not period:
            continue
        tech = tech_by_id.get(tech_id)
        if not tech:
            print(f"  SKIP {d.get('id')}: technician {tech_id} not found")
            continue
        rate_parts = tech.get('commissionRateParts') or tech.get('commissionRate') or 0
        rate_hw = tech.get('commissionRateHardware') or tech.get('commissionRate') or 0
        tickets = agg.get((tech_id, period), {}).get('tickets', [])
        new_labor = sum(labor_revenue(wo) for wo in tickets)
        new_parts = sum(parts_cost(wo) for wo in tickets)
        new_commission = 0
        for wo in tickets:
            rate = rate_hw if repair_type(wo) == 'hardware' else rate_parts
            new_commission += round(commission_base(wo) * rate / 100)
        old = {'laborRev': d.get('totalLaborRevenue') or 0, 'partsCost': d.get('totalPartsCost') or 0, 'commission': d.get('commissionAmount') or 0, 'tickets': d.get('totalTicketsClosed') or 0}
        print(f"  UPDATE {d.get('id')} | {d.get('technicianName')} | {period} | tickets {old['tickets']}→{len(tickets)} | laborRev {old['laborRev']}→{new_labor} | partsCost {old['partsCost']}→{new_parts} | commission {old['commission']}→{new_commission}")
        if new_commission == old['commission'] and new_labor == old['laborRev'] and new_parts == old['partsCost']:
            print("    (unchanged)")
            continue
        if dry:
            continue
        updated = {**d, 'totalTicketsClosed': len(tickets), 'totalLaborRevenue': new_labor, 'totalPartsCost': new_parts, 'commissionAmount': new_commission, 'netPayout': new_commission}
        api('PATCH', f"{ENDPOINT}?collection_name=eq.technicianPayouts&id=eq.{d.get('id')}", {'data': updated})
        changed += 1

    # 2) CREATE missing payouts for paid tickets without a record (Ko Hein 2026-08-11).
    for (tech_id, period), a in sorted(agg.items()):
        if (tech_id, period) in existing_keys:
            continue
        tech = tech_by_id.get(tech_id)
        if not tech:
            continue
        tickets = a['tickets']
        if not tickets:
            continue
        rate_parts = tech.get('commissionRateParts') or tech.get('commissionRate') or 0
        rate_hw = tech.get('commissionRateHardware') or tech.get('commissionRate') or 0
        new_commission = 0
        for wo in tickets:
            rate = rate_hw if repair_type(wo) == 'hardware' else rate_parts
            new_commission += round(commission_base(wo) * rate / 100)
        payout_id = f"payout-{tech_id}-{period}"
        rec = {
            'id': payout_id,
            'technicianId': tech_id,
            'technicianName': tech.get('name') or tech_id,
            'period': period,
            'totalTicketsClosed': len(tickets),
            'totalLaborRevenue': a['labor'],
            'totalPartsCost': a['parts'],
            'commissionRatePercent': rate_parts,
            'commissionAmount': new_commission,
            'netPayout': new_commission,
            'status': 'Pending',
            'notes': 'Auto-created from paid work orders (recalc 2026-08-11)',
        }
        print(f"  CREATE {payout_id} | {rec['technicianName']} | {period} | tickets {len(tickets)} | laborRev {a['labor']} | partsCost {a['parts']} | commission {new_commission}")
        if dry:
            continue
        # Upsert (insert) — collection_name + id conflict key
        api('POST', ENDPOINT, {'collection_name': 'technicianPayouts', 'id': payout_id, 'data': rec})
        created += 1

    print(f"\n{'DRY-RUN — ' if dry else ''}Done. Updated: {changed} | Created: {created}")

if __name__ == '__main__':
    main()
