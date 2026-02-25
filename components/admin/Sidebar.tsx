"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Users,
  Coffee,
  Settings,
  Trophy,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin/topics", label: "Polls", icon: BookOpen },
  { href: "/admin/quizzes", label: "Quizzes", icon: Trophy },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/break", label: "Take a Break", icon: Coffee },
];

const bottomItems = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background">
      <div className="flex items-center gap-2 px-6 py-5">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">MyPoll Admin</span>
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-secondary-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="flex flex-col gap-1 p-3">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-secondary-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-3 px-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
