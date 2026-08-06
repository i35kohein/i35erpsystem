// UI primitives barrel — the standard building blocks.
// New components should import from here instead of raw className hex.
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';
export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export { Input } from './input';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from './dialog';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuPortal } from './dropdown-menu';
