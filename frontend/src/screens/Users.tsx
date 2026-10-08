/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Button, Card, CardContent, Input, Label, Table, THead, TBody, TR, TH, TD } = UI;
const {
  Plus,
  Search,
  Check,
  X,
  User,
  Users,
  Settings,
  Edit,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
} = Icons;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CURRENT_USER_ID = 1;

const INITIAL_USERS = [
  {
    id: 1,
    name: "Satya Ganaraju",
    email: "satya.ganaraju@quorq.ai",
    role: "admin",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-01-12",
    last_seen: "Today at 09:14",
  },
  {
    id: 2,
    name: "Alice Berensen",
    email: "alice.berensen@quorq.ai",
    role: "admin",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-02-03",
    last_seen: "Today at 08:40",
  },
  {
    id: 3,
    name: "Nkechi Obi",
    email: "nkechi.obi@quorq.ai",
    role: "admin",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-01-29",
    last_seen: "Yesterday at 18:12",
  },
  {
    id: 4,
    name: "Marcus Odell",
    email: "marcus.odell@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-03-18",
    last_seen: "Yesterday at 16:52",
  },
  {
    id: 5,
    name: "Priya Raghunathan",
    email: "priya.raghunathan@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-04-02",
    last_seen: "Today at 11:05",
  },
  {
    id: 6,
    name: "Tom Whitcombe",
    email: "tom.whitcombe@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: "10:26",
    failed_attempts: 5,
    created_at: "2026-05-20",
    last_seen: "6 Oct at 15:31",
  },
  {
    id: 7,
    name: "Dana Kowalczyk",
    email: "dana.kowalczyk@quorq.ai",
    role: "employee",
    is_enabled: false,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-02-27",
    last_seen: "11 Sep at 09:02",
  },
  {
    id: 8,
    name: "Ruth Ellison",
    email: "ruth.ellison@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 2,
    created_at: "2026-06-11",
    last_seen: "2 Oct at 13:47",
  },
  {
    id: 9,
    name: "Joel Nakamura",
    email: "joel.nakamura@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-07-01",
    last_seen: "Today at 07:58",
  },
  {
    id: 10,
    name: "Felix Adeyemi",
    email: "felix.adeyemi@quorq.ai",
    role: "employee",
    is_enabled: true,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-10-07",
    last_seen: null,
  },
  {
    id: 11,
    name: "Harriet Lindqvist",
    email: "harriet.lindqvist@quorq.ai",
    role: "employee",
    is_enabled: false,
    locked_until: null,
    failed_attempts: 0,
    created_at: "2026-03-05",
    last_seen: "22 Aug at 10:19",
  },
];

const ROLE_FILTERS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "employee", label: "Employees" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "locked", label: "Locked" },
  { value: "disabled", label: "Disabled" },
];

const PASSWORD_MIN = 10;
const PASSWORD_WORDS = [
  "harbour",
  "lantern",
  "meadow",
  "quartz",
  "ledger",
  "bramble",
  "cobalt",
  "pennant",
];

function formatDate(iso) {
  const parts = String(iso).split("-");
  if (parts.length !== 3) return iso;
  return `${Number(parts[2])} ${MONTHS[Number(parts[1]) - 1]} ${parts[0]}`;
}

function titleCaseFromEmail(email) {
  const local = String(email).split("@")[0] || "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function initialsOf(name) {
  const bits = String(name).trim().split(/\s+/);
  if (bits.length === 1) return bits[0].slice(0, 2).toUpperCase();
  return (bits[0][0] + bits[bits.length - 1][0]).toUpperCase();
}

function statusOf(user) {
  if (!user.is_enabled) return "disabled";
  if (user.locked_until) return "locked";
  return "active";
}

function suggestPassword() {
  const w1 = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const w2 = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)];
  const n = String(Math.floor(Math.random() * 90) + 10);
  return `${w1}-${w2}-${n}`;
}

export default function Screen() {
  const navigate = useNavigate();
  const { Button, Card, CardContent, Input, Label, Table, THead, TBody, TR, TH, TD } = UI;

  const [users, setUsers] = React.useState(INITIAL_USERS);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selfSignup, setSelfSignup] = React.useState(false);
  const [notice, setNotice] = React.useState(null);

  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [resetUser, setResetUser] = React.useState(null);

  const [addEmail, setAddEmail] = React.useState("");
  const [addPassword, setAddPassword] = React.useState("");
  const [addIsAdmin, setAddIsAdmin] = React.useState(false);
  const [addErrors, setAddErrors] = React.useState<Record<string, string>>({});

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [resetErrors, setResetErrors] = React.useState<Record<string, string>>({});

  const menuRef = React.useRef(null);
  const triggerRefs = React.useRef({});
  const addButtonRef = React.useRef(null);
  const returnFocusRef = React.useRef(null);
  const addDialogRef = React.useRef(null);
  const resetDialogRef = React.useRef(null);
  const addFirstFieldRef = React.useRef(null);
  const resetFirstFieldRef = React.useRef(null);

  const navy = brand.primaryColor;
  const green = brand.accentColor;

  // --- derived data -------------------------------------------------------
  const counts = React.useMemo(
    function () {
      return {
        total: users.length,
        admins: users.filter(function (u) {
          return u.role === "admin";
        }).length,
        active: users.filter(function (u) {
          return statusOf(u) === "active";
        }).length,
        attention: users.filter(function (u) {
          return statusOf(u) !== "active";
        }).length,
      };
    },
    [users],
  );

  const visible = React.useMemo(
    function () {
      const q = query.trim().toLowerCase();
      return users.filter(function (u) {
        const matchesQuery =
          !q || u.email.toLowerCase().indexOf(q) !== -1 || u.name.toLowerCase().indexOf(q) !== -1;
        const matchesRole = roleFilter === "all" || u.role === roleFilter;
        const matchesStatus = statusFilter === "all" || statusOf(u) === statusFilter;
        return matchesQuery && matchesRole && matchesStatus;
      });
    },
    [users, query, roleFilter, statusFilter],
  );

  const filtersActive = query.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  // --- menu behaviour -----------------------------------------------------
  React.useEffect(
    function () {
      if (openMenuId == null) return undefined;
      function onPointerDown(event) {
        if (menuRef.current && menuRef.current.contains(event.target)) return;
        const trigger = triggerRefs.current[openMenuId];
        if (trigger && trigger.contains(event.target)) return;
        setOpenMenuId(null);
      }
      document.addEventListener("mousedown", onPointerDown);
      return function () {
        document.removeEventListener("mousedown", onPointerDown);
      };
    },
    [openMenuId],
  );

  React.useEffect(
    function () {
      if (openMenuId == null || !menuRef.current) return;
      const first = menuRef.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])');
      if (first) first.focus();
    },
    [openMenuId],
  );

  function closeMenu(focusTrigger) {
    const id = openMenuId;
    setOpenMenuId(null);
    if (focusTrigger && id != null && triggerRefs.current[id]) triggerRefs.current[id].focus();
  }

  function onMenuKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeMenu(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.prototype.slice
      .call(menuRef.current.querySelectorAll('[role="menuitem"]'))
      .filter(function (el) {
        return el.getAttribute("aria-disabled") !== "true";
      });
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
    items[next].focus();
  }

  // --- dialog behaviour ---------------------------------------------------
  React.useEffect(
    function () {
      if (addOpen && addFirstFieldRef.current) addFirstFieldRef.current.focus();
    },
    [addOpen],
  );

  React.useEffect(
    function () {
      if (resetUser && resetFirstFieldRef.current) resetFirstFieldRef.current.focus();
    },
    [resetUser],
  );

  function trapKeyDown(ref, onClose) {
    return function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
  }

  function openAddDialog() {
    returnFocusRef.current = addButtonRef.current;
    setAddEmail("");
    setAddPassword("");
    setAddIsAdmin(false);
    setAddErrors({});
    setAddOpen(true);
  }

  function closeAddDialog() {
    setAddOpen(false);
    if (returnFocusRef.current) returnFocusRef.current.focus();
  }

  function openResetDialog(user) {
    returnFocusRef.current = triggerRefs.current[user.id] || null;
    setNewPassword("");
    setConfirmPassword("");
    setResetErrors({});
    setOpenMenuId(null);
    setResetUser(user);
  }

  function closeResetDialog() {
    setResetUser(null);
    if (returnFocusRef.current) returnFocusRef.current.focus();
  }

  // --- actions ------------------------------------------------------------
  function announce(text) {
    setNotice(text);
  }

  function toggleRole(user) {
    const nextRole = user.role === "admin" ? "employee" : "admin";
    setUsers(function (prev) {
      return prev.map(function (u) {
        return u.id === user.id ? Object.assign({}, u, { role: nextRole }) : u;
      });
    });
    announce(
      nextRole === "admin"
        ? `${user.email} is now an admin. They can upload and delete documents and manage users.`
        : `Admin rights removed from ${user.email}. They keep employee access to chat and the knowledge base.`,
    );
    closeMenu(true);
  }

  function toggleEnabled(user) {
    const nextEnabled = !user.is_enabled;
    setUsers(function (prev) {
      return prev.map(function (u) {
        return u.id === user.id
          ? Object.assign({}, u, {
              is_enabled: nextEnabled,
              locked_until: nextEnabled ? u.locked_until : null,
            })
          : u;
      });
    });
    announce(
      nextEnabled
        ? `${user.email} is enabled again and can sign in.`
        : `${user.email} is disabled. Their active session is rejected on the next request.`,
    );
    closeMenu(true);
  }

  function clearLock(user) {
    setUsers(function (prev) {
      return prev.map(function (u) {
        return u.id === user.id
          ? Object.assign({}, u, { locked_until: null, failed_attempts: 0 })
          : u;
      });
    });
    announce(`Sign-in lock cleared for ${user.email}. They can try again straight away.`);
    closeMenu(true);
  }

  function submitAddUser(event) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const email = addEmail.trim().toLowerCase();
    if (!email) {
      errors.email = "Enter a work email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address, for example name@quorq.ai.";
    } else if (
      users.some(function (u) {
        return u.email.toLowerCase() === email;
      })
    ) {
      errors.email = "An account already exists for this email address.";
    }
    if (addPassword.length < PASSWORD_MIN) {
      errors.password = `The initial password must be at least ${PASSWORD_MIN} characters.`;
    }
    setAddErrors(errors);
    if (Object.keys(errors).length) return;

    const nextId =
      users.reduce(function (max, u) {
        return Math.max(max, u.id);
      }, 0) + 1;
    const created = {
      id: nextId,
      name: titleCaseFromEmail(email),
      email: email,
      role: addIsAdmin ? "admin" : "employee",
      is_enabled: true,
      locked_until: null,
      failed_attempts: 0,
      created_at: "2026-10-08",
      last_seen: null,
    };
    setUsers(function (prev) {
      return [created].concat(prev);
    });
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    announce(`Account created for ${email}. No email is sent — give them the password directly.`);
    closeAddDialog();
  }

  function submitReset(event) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (newPassword.length < PASSWORD_MIN) {
      errors.newPassword = `The new password must be at least ${PASSWORD_MIN} characters.`;
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = "The two passwords do not match.";
    }
    setResetErrors(errors);
    if (Object.keys(errors).length) return;

    const target = resetUser;
    setUsers(function (prev) {
      return prev.map(function (u) {
        return u.id === target.id
          ? Object.assign({}, u, { locked_until: null, failed_attempts: 0 })
          : u;
      });
    });
    announce(`Password reset for ${target.email}. Any sign-in lock has been cleared.`);
    closeResetDialog();
  }

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  // --- small presentational helpers --------------------------------------
  function StatTile(props) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium" style={{ color: brand.neutralColor }}>
          {props.label}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: navy }}>
          {props.value}
        </p>
        <p className="mt-1 text-xs" style={{ color: brand.neutralColor }}>
          {props.hint}
        </p>
      </div>
    );
  }

  function StatusCell(props) {
    const user = props.user;
    const status = statusOf(user);
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-900">
          <Icons.CheckCircle aria-hidden="true" className="h-4 w-4" style={{ color: green }} />
          Active
        </span>
      );
    }
    if (status === "locked") {
      return (
        <span className="inline-flex flex-col gap-0.5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-900">
            <Icons.AlertCircle aria-hidden="true" className="h-4 w-4" />
            Locked until {user.locked_until}
          </span>
          <span className="pl-1 text-xs" style={{ color: brand.neutralColor }}>
            {user.failed_attempts} failed sign-ins
          </span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
        <Icons.X aria-hidden="true" className="h-4 w-4" />
        Disabled
      </span>
    );
  }

  const fieldClass =
    "mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1";

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      style={{ fontFamily: brand.fontBody, color: "#1B2430" }}
    >
      {/* Heading ---------------------------------------------------------- */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: navy, fontFamily: brand.fontHeading }}
          >
            Users
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
            Add colleagues, grant or remove admin rights, disable leavers and reset forgotten
            passwords. Knowledge Assistant sends no email, so pass new and reset passwords on
            directly.
          </p>
        </div>
        <Button
          ref={addButtonRef}
          type="button"
          onClick={openAddDialog}
          className="inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          style={{ backgroundColor: navy, color: "#FFFFFF" }}
        >
          <Icons.Plus aria-hidden="true" className="h-4 w-4" />
          Add user
        </Button>
      </header>

      {/* Live region ------------------------------------------------------ */}
      <div role="status" aria-live="polite" className="mt-6">
        {notice ? (
          <div
            className="flex items-start gap-3 rounded-lg border bg-white px-4 py-3"
            style={{ borderColor: green }}
          >
            <Icons.CheckCircle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: green }}
            />
            <p className="flex-1 text-sm leading-relaxed text-slate-800">{notice}</p>
            <button
              type="button"
              onClick={function () {
                setNotice(null);
              }}
              aria-label="Dismiss this message"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Icons.X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Stats ------------------------------------------------------------ */}
      <section aria-labelledby="overview-heading" className="mt-6">
        <h2 id="overview-heading" className="sr-only">
          Account overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Accounts" value={counts.total} hint="All employee and admin accounts" />
          <StatTile
            label="Admins"
            value={counts.admins}
            hint="Can upload, delete and manage users"
          />
          <StatTile label="Active" value={counts.active} hint="Able to sign in right now" />
          <StatTile
            label="Locked or disabled"
            value={counts.attention}
            hint="Cannot sign in until you act"
          />
        </div>
      </section>

      {/* Self-signup setting ---------------------------------------------- */}
      <section aria-labelledby="signup-heading" className="mt-6">
        <Card className="rounded-lg border border-slate-200 bg-white">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 id="signup-heading" className="text-base font-semibold" style={{ color: navy }}>
                Self-service account creation
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                When this is off, the Sign in page offers no “Create account” link and the signup
                endpoint is refused. Accounts can then only be created here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-800" id="signup-state">
                {selfSignup ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={selfSignup}
                aria-labelledby="signup-heading signup-state"
                onClick={function () {
                  const next = !selfSignup;
                  setSelfSignup(next);
                  announce(
                    next
                      ? "Self-service account creation is on. New visitors can create their own employee account."
                      : "Self-service account creation is off. Only admins can create accounts.",
                  );
                }}
                className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                style={{ backgroundColor: selfSignup ? green : "#E2E7EC" }}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: selfSignup ? "translateX(22px)" : "translateX(3px)" }}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* User list -------------------------------------------------------- */}
      <section aria-labelledby="list-heading" className="mt-8">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                id="list-heading"
                className="text-lg font-semibold"
                style={{ color: navy, fontFamily: brand.fontHeading }}
              >
                All accounts
              </h2>
              <p className="mt-1 text-sm" style={{ color: brand.neutralColor }}>
                Showing {visible.length} of {users.length} accounts
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
              <div className="sm:col-span-1">
                <Label htmlFor="user-search" className="block text-sm font-medium text-slate-800">
                  Search
                </Label>
                <div className="relative">
                  <Icons.Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    id="user-search"
                    type="search"
                    value={query}
                    onChange={function (e) {
                      setQuery(e.target.value);
                    }}
                    placeholder="Name or email"
                    className={fieldClass + " pl-9"}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role-filter" className="block text-sm font-medium text-slate-800">
                  Role
                </Label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={function (e) {
                    setRoleFilter(e.target.value);
                  }}
                  className={fieldClass}
                >
                  {ROLE_FILTERS.map(function (option) {
                    return (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label htmlFor="status-filter" className="block text-sm font-medium text-slate-800">
                  Status
                </Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={function (e) {
                    setStatusFilter(e.target.value);
                  }}
                  className={fieldClass}
                >
                  {STATUS_FILTERS.map(function (option) {
                    return (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Icons.Users aria-hidden="true" className="h-8 w-8 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-900">
                No accounts match these filters
              </h3>
              <p className="max-w-sm text-sm" style={{ color: brand.neutralColor }}>
                Nothing matches “{query.trim() || "the current filters"}”. Try a different search
                term or clear the filters to see all {users.length} accounts.
              </p>
              <Button
                type="button"
                onClick={clearFilters}
                className="mt-1 inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                style={{ backgroundColor: "#FFFFFF", color: navy, borderColor: "#CBD5E1" }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <Table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Knowledge Assistant accounts, with role, status, date added and last activity
              </caption>
              <THead>
                <TR className="border-b border-slate-200">
                  <TH
                    scope="col"
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: brand.neutralColor }}
                  >
                    User
                  </TH>
                  <TH
                    scope="col"
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: brand.neutralColor }}
                  >
                    Role
                  </TH>
                  <TH
                    scope="col"
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: brand.neutralColor }}
                  >
                    Status
                  </TH>
                  <TH
                    scope="col"
                    className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wide md:table-cell"
                    style={{ color: brand.neutralColor }}
                  >
                    Added
                  </TH>
                  <TH
                    scope="col"
                    className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wide lg:table-cell"
                    style={{ color: brand.neutralColor }}
                  >
                    Last active
                  </TH>
                  <TH
                    scope="col"
                    className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                    style={{ color: brand.neutralColor }}
                  >
                    Actions
                  </TH>
                </TR>
              </THead>
              <TBody>
                {visible.map(function (user) {
                  const isSelf = user.id === CURRENT_USER_ID;
                  const isOpen = openMenuId === user.id;
                  const status = statusOf(user);
                  return (
                    <TR key={user.id} className="border-b border-slate-100 align-top last:border-0">
                      <TD className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: user.role === "admin" ? navy : "#6A7C90" }}
                          >
                            {initialsOf(user.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {user.name}
                              </span>
                              {isSelf ? (
                                <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                  You
                                </span>
                              ) : null}
                            </span>
                            <span
                              className="block truncate text-sm"
                              style={{ color: brand.neutralColor }}
                            >
                              {user.email}
                            </span>
                          </span>
                        </div>
                      </TD>

                      <TD className="px-5 py-4">
                        {user.role === "admin" ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium"
                            style={{ backgroundColor: "#E7ECF3", color: navy }}
                          >
                            <Icons.Settings aria-hidden="true" className="h-3.5 w-3.5" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-700">
                            <Icons.User aria-hidden="true" className="h-3.5 w-3.5" />
                            Employee
                          </span>
                        )}
                      </TD>

                      <TD className="px-5 py-4">
                        <StatusCell user={user} />
                      </TD>

                      <TD
                        className="hidden px-5 py-4 text-sm md:table-cell"
                        style={{ color: brand.neutralColor }}
                      >
                        {formatDate(user.created_at)}
                      </TD>

                      <TD
                        className="hidden px-5 py-4 text-sm lg:table-cell"
                        style={{ color: brand.neutralColor }}
                      >
                        {user.last_seen || "Never signed in"}
                      </TD>

                      <TD className="relative px-5 py-4 text-right">
                        <button
                          type="button"
                          ref={function (el) {
                            triggerRefs.current[user.id] = el;
                          }}
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                          aria-label={`Actions for ${user.name}`}
                          onClick={function () {
                            setOpenMenuId(isOpen ? null : user.id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                        >
                          <Icons.MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                        </button>

                        {isOpen ? (
                          <div
                            ref={menuRef}
                            role="menu"
                            aria-label={`Actions for ${user.name}`}
                            onKeyDown={onMenuKeyDown}
                            className="absolute right-5 z-30 mt-2 w-60 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={function () {
                                openResetDialog(user);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
                            >
                              <Icons.Edit aria-hidden="true" className="h-4 w-4 text-slate-500" />
                              Reset password
                            </button>

                            {status === "locked" ? (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={function () {
                                  clearLock(user);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
                              >
                                <Icons.Check
                                  aria-hidden="true"
                                  className="h-4 w-4 text-slate-500"
                                />
                                Clear sign-in lock
                              </button>
                            ) : null}

                            <button
                              type="button"
                              role="menuitem"
                              aria-disabled={isSelf ? "true" : undefined}
                              onClick={function () {
                                if (isSelf) return;
                                toggleRole(user);
                              }}
                              className={
                                "flex w-full items-center gap-2 px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 " +
                                (isSelf
                                  ? "cursor-not-allowed text-slate-400"
                                  : "text-slate-800 hover:bg-slate-50 focus:bg-slate-50")
                              }
                            >
                              <Icons.Users aria-hidden="true" className="h-4 w-4 text-slate-500" />
                              {user.role === "admin" ? "Remove admin rights" : "Make admin"}
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              aria-disabled={isSelf ? "true" : undefined}
                              onClick={function () {
                                if (isSelf) return;
                                toggleEnabled(user);
                              }}
                              className={
                                "flex w-full items-center gap-2 px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 " +
                                (isSelf
                                  ? "cursor-not-allowed text-slate-400"
                                  : "text-slate-800 hover:bg-slate-50 focus:bg-slate-50")
                              }
                            >
                              {user.is_enabled ? (
                                <Icons.X aria-hidden="true" className="h-4 w-4 text-slate-500" />
                              ) : (
                                <Icons.CheckCircle
                                  aria-hidden="true"
                                  className="h-4 w-4 text-slate-500"
                                />
                              )}
                              {user.is_enabled ? "Disable account" : "Enable account"}
                            </button>

                            {isSelf ? (
                              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                                You cannot change your own role or disable your own account.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>

        <p className="mt-4 text-sm" style={{ color: brand.neutralColor }}>
          Employees never see this page. Looking for document access instead?{" "}
          <button
            type="button"
            onClick={function () {
              navigate("knowledge-base");
            }}
            className="font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            style={{ color: navy }}
          >
            Open the knowledge base
          </button>
          .
        </p>
      </section>

      {/* Add user dialog --------------------------------------------------- */}
      {addOpen ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
          <div
            ref={addDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            aria-describedby="add-user-desc"
            onKeyDown={trapKeyDown(addDialogRef, closeAddDialog)}
            className="w-full max-w-lg rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="add-user-title"
                  className="text-lg font-semibold"
                  style={{ color: navy, fontFamily: brand.fontHeading }}
                >
                  Add a user
                </h2>
                <p
                  id="add-user-desc"
                  className="mt-1 text-sm"
                  style={{ color: brand.neutralColor }}
                >
                  The account is enabled straight away. No email is sent — share the initial
                  password with them yourself.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddDialog}
                aria-label="Close the add user dialog"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Icons.X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitAddUser} noValidate>
              <div className="space-y-5 px-6 py-5">
                <div>
                  <Label htmlFor="new-email" className="block text-sm font-medium text-slate-800">
                    Work email
                  </Label>
                  <Input
                    id="new-email"
                    ref={addFirstFieldRef}
                    type="email"
                    value={addEmail}
                    onChange={function (e) {
                      setAddEmail(e.target.value);
                    }}
                    aria-invalid={addErrors.email ? "true" : undefined}
                    aria-describedby={addErrors.email ? "new-email-error" : undefined}
                    className={fieldClass}
                  />
                  {addErrors.email ? (
                    <p
                      id="new-email-error"
                      className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700"
                    >
                      <Icons.AlertCircle aria-hidden="true" className="h-4 w-4" />
                      {addErrors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <Label
                      htmlFor="new-password"
                      className="block text-sm font-medium text-slate-800"
                    >
                      Initial password
                    </Label>
                    <button
                      type="button"
                      onClick={function () {
                        setAddPassword(suggestPassword());
                        setAddErrors(function (prev) {
                          const next = Object.assign({}, prev);
                          delete next.password;
                          return next;
                        });
                      }}
                      className="text-sm font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                      style={{ color: navy }}
                    >
                      Suggest one
                    </button>
                  </div>
                  <Input
                    id="new-password"
                    type="text"
                    value={addPassword}
                    onChange={function (e) {
                      setAddPassword(e.target.value);
                    }}
                    aria-invalid={addErrors.password ? "true" : undefined}
                    aria-describedby={
                      addErrors.password ? "new-password-error" : "new-password-hint"
                    }
                    className={fieldClass}
                  />
                  {addErrors.password ? (
                    <p
                      id="new-password-error"
                      className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700"
                    >
                      <Icons.AlertCircle aria-hidden="true" className="h-4 w-4" />
                      {addErrors.password}
                    </p>
                  ) : (
                    <p
                      id="new-password-hint"
                      className="mt-1.5 text-sm"
                      style={{ color: brand.neutralColor }}
                    >
                      At least {PASSWORD_MIN} characters. Stored as a bcrypt hash; they can change
                      it on the Account page.
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <input
                    id="new-is-admin"
                    type="checkbox"
                    checked={addIsAdmin}
                    onChange={function (e) {
                      setAddIsAdmin(e.target.checked);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    style={{ accentColor: navy }}
                  />
                  <span>
                    <Label htmlFor="new-is-admin" className="text-sm font-medium text-slate-800">
                      Grant admin rights
                    </Label>
                    <span className="mt-0.5 block text-sm" style={{ color: brand.neutralColor }}>
                      Admins can upload and delete documents and manage every account.
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={closeAddDialog}
                  className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  style={{ backgroundColor: "#FFFFFF", color: navy, borderColor: "#CBD5E1" }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  style={{ backgroundColor: navy, color: "#FFFFFF" }}
                >
                  <Icons.Plus aria-hidden="true" className="h-4 w-4" />
                  Create account
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Reset password dialog --------------------------------------------- */}
      {resetUser ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
          <div
            ref={resetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-desc"
            onKeyDown={trapKeyDown(resetDialogRef, closeResetDialog)}
            className="w-full max-w-lg rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="reset-title"
                  className="text-lg font-semibold"
                  style={{ color: navy, fontFamily: brand.fontHeading }}
                >
                  Reset password
                </h2>
                <p id="reset-desc" className="mt-1 text-sm" style={{ color: brand.neutralColor }}>
                  Setting a new password for{" "}
                  <strong className="font-semibold text-slate-800">{resetUser.email}</strong>{" "}
                  replaces the stored hash and clears any sign-in lock on that email.
                </p>
              </div>
              <button
                type="button"
                onClick={closeResetDialog}
                aria-label="Close the reset password dialog"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Icons.X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitReset} noValidate>
              <div className="space-y-5 px-6 py-5">
                <div>
                  <Label htmlFor="reset-new" className="block text-sm font-medium text-slate-800">
                    New password
                  </Label>
                  <Input
                    id="reset-new"
                    ref={resetFirstFieldRef}
                    type="text"
                    value={newPassword}
                    onChange={function (e) {
                      setNewPassword(e.target.value);
                    }}
                    aria-invalid={resetErrors.newPassword ? "true" : undefined}
                    aria-describedby={
                      resetErrors.newPassword ? "reset-new-error" : "reset-new-hint"
                    }
                    className={fieldClass}
                  />
                  {resetErrors.newPassword ? (
                    <p
                      id="reset-new-error"
                      className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700"
                    >
                      <Icons.AlertCircle aria-hidden="true" className="h-4 w-4" />
                      {resetErrors.newPassword}
                    </p>
                  ) : (
                    <p
                      id="reset-new-hint"
                      className="mt-1.5 text-sm"
                      style={{ color: brand.neutralColor }}
                    >
                      At least {PASSWORD_MIN} characters.
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="reset-confirm"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Confirm new password
                  </Label>
                  <Input
                    id="reset-confirm"
                    type="text"
                    value={confirmPassword}
                    onChange={function (e) {
                      setConfirmPassword(e.target.value);
                    }}
                    aria-invalid={resetErrors.confirmPassword ? "true" : undefined}
                    aria-describedby={
                      resetErrors.confirmPassword ? "reset-confirm-error" : undefined
                    }
                    className={fieldClass}
                  />
                  {resetErrors.confirmPassword ? (
                    <p
                      id="reset-confirm-error"
                      className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700"
                    >
                      <Icons.AlertCircle aria-hidden="true" className="h-4 w-4" />
                      {resetErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={closeResetDialog}
                  className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  style={{ backgroundColor: "#FFFFFF", color: navy, borderColor: "#CBD5E1" }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  style={{ backgroundColor: navy, color: "#FFFFFF" }}
                >
                  <Icons.Check aria-hidden="true" className="h-4 w-4" />
                  Set password
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
