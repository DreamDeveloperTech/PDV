/**
 * Bottom navigation bar for mobile.
 * Mirrors the main store navigation used in the sidebar.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  ArrowLeftRight,
  Banknote,
  ListOrdered,
} from "lucide-react";

interface BottomNavProps {
  storeId: string;
  role: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

export function BottomNav({ storeId, role }: BottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: `/stores/${storeId}/dashboard`,
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/pos`,
      label: "PDV",
      icon: <ShoppingCart size={18} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/cash-sessions`,
      label: "Caixa",
      icon: <Banknote size={18} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/sales`,
      label: "Vendas",
      icon: <ListOrdered size={18} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/products`,
      label: "Produtos",
      icon: <Package size={18} />,
      roles: ["MASTER", "OWNER"],
    },
    {
      href: `/stores/${storeId}/customers`,
      label: "Clientes",
      icon: <Users size={18} />,
      roles: ["MASTER", "OWNER"],
    },
    {
      href: `/stores/${storeId}/receivables`,
      label: "Fiado",
      icon: <Receipt size={18} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="flex items-center justify-between px-2 py-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium
                  ${isActive ? "text-blue-600" : "text-gray-500"}
                `}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

