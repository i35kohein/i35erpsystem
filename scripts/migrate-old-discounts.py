#!/usr/bin/env python3
"""One-time migration: fix old work orders with duplicate discountAmount.

Old format: lineItems[].unitPrice = FINAL price (discount baked in),
workOrder.discountAmount = same discount stored again (duplicate).
POS recalculateTotals was double-subtracting → wrong totals.

Fix: recover original prices, set per-item %, zero discountAmount.
"""
import json, os, sys, urllib.request, urllib.error

PUB = os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
URL = os.environ.get('VITE_SUPABASE_URL', '')
if not PUB or not URL:
    # load from .env.local
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

def fetch_all():
    rows, offset = [], 0
    while True:
        page = api('GET', f"{ENDPOINT}?select=data&collection_name=eq.workOrders&limit=100&offset={offset}")
        rows.extend(page)
        if len(page) < 100:
            break
        offset += 100
    return rows

def main():
    dry = '--dry' in sys.argv
    rows = fetch_all()
    print(f"Total workOrders: {len(rows)}")

    # Backup
    backup_path = os.path.join(os.path.dirname(__file__), '..', '..', 'mpsd', 'db', f'workorders-backup-{__import__("time").strftime("%Y%m%d-%H%M%S")}.json')
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    with open(backup_path, 'w') as f:
        json.dump(rows, f, indent=1)
    print(f"Backup → {backup_path}")

    changed = 0
    for r in rows:
        d = r.get('data', {})
        if not isinstance(d, dict):
            continue
        wo_id = d.get('id')
        dis = d.get('discountAmount') or 0
        lis = d.get('lineItems') or []
        if dis <= 0:
            continue
        has_pct = any(li.get('lineItemDiscountPercent') for li in lis)
        # final total the line items actually produce (with per-item discounts)
        discounted_final = sum(
            (li.get('unitPrice') or 0) * (1 - (li.get('lineItemDiscountPercent') or 0) / 100) * (li.get('quantity') or 1)
            for li in lis
        )
        raw_final = sum((li.get('unitPrice') or 0) * (li.get('quantity') or 1) for li in lis)
        # For old-format tickets, unitPrice IS final → raw_final == discounted_final
        orig_sum = max(d.get('subtotal') or 0, discounted_final + dis)
        if orig_sum <= 0 or discounted_final <= 0:
            print(f"  SKIP {wo_id}: orig_sum={orig_sum} final={discounted_final}")
            continue

        new_lis = list(lis)
        if not has_pct and discounted_final < orig_sum:
            ratio = orig_sum / discounted_final
            disc_pct = round((1 - discounted_final / orig_sum) * 100)
            disc_pct = max(0, min(99, disc_pct))
            for i, li in enumerate(new_lis):
                nl = dict(li)
                nl['unitPrice'] = round((li.get('unitPrice') or 0) * ratio)
                if li.get('isLabor'):
                    nl['lineItemDiscountPercent'] = disc_pct
                new_lis[i] = nl
        elif has_pct:
            pass  # only need discountAmount → 0

        new_data = dict(d)
        new_data['discountAmount'] = 0
        new_data['subtotal'] = orig_sum
        new_data['lineItems'] = new_lis
        # Keep exact final total (what customer pays) — no rounding drift
        new_data['totalAmount'] = round(discounted_final)
        new_data['updatedAt'] = d.get('updatedAt') or new_data.get('createdAt')

        print(f"  {'[DRY] ' if dry else 'FIX  '}{wo_id}: sub {d.get('subtotal')}→{orig_sum}, disc {dis}→0, total {d.get('totalAmount')}→{round(discounted_final)}")
        if not dry:
            api('PATCH', f"{ENDPOINT}?id=eq.{wo_id}", {"data": new_data})
            changed += 1

    print(f"\n{'[DRY RUN — no changes written]' if dry else f'Done. {changed} work orders updated.'}")

if __name__ == '__main__':
    main()
