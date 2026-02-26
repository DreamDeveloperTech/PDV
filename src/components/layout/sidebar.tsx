/**
 * Sidebar navigation component.
 * Shows different menu items based on user role.
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
  Store,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";

interface SidebarProps {
  storeId: string;
  storeName: string;
  role: string;
  userName: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

export function Sidebar({ storeId, storeName, role, userName }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: `/stores/${storeId}/dashboard`,
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/pos`,
      label: "PDV",
      icon: <ShoppingCart size={20} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
    {
      href: `/stores/${storeId}/products`,
      label: "Produtos",
      icon: <Package size={20} />,
      roles: ["MASTER", "OWNER"],
    },
    {
      href: `/stores/${storeId}/stock`,
      label: "Estoque",
      icon: <ArrowLeftRight size={20} />,
      roles: ["MASTER", "OWNER"],
    },
    {
      href: `/stores/${storeId}/customers`,
      label: "Clientes",
      icon: <Users size={20} />,
      roles: ["MASTER", "OWNER"],
    },
    {
      href: `/stores/${storeId}/receivables`,
      label: "Fiado",
      icon: <Receipt size={20} />,
      roles: ["MASTER", "OWNER", "EMPLOYEE"],
    },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Store header */}
      <div className="border-b border-gray-200 px-4 py-4">
        <Link href="/stores" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <Store size={18} />
          <span className="text-xs">Trocar loja</span>
        </Link>
        <h2 className="mt-2 text-lg font-bold text-gray-900 truncate">{storeName}</h2>
        <p className="text-xs text-gray-500">{role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
