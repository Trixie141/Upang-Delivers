import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "student" | "delivery" | "admin";

export type RequestStatus = "IN PROGRESS" | "LOOKING FOR RUNNER" | "COMPLETED";

export type ErrandRequest = {
  id: string;
  title: string;
  status: RequestStatus;
  to: string;
  posted: string;
  reward: number;
  runner?: { name: string; note: string; avatar: string };
};

export type HistoryItem = {
  task: string;
  by: string;
  emoji: string;
  date: string;
  amount: number;
  status: "SUCCESS" | "CANCELLED";
};

export type Profile = {
  name: string;
  program: string;
  studentId: string;
  email: string;
  phone: string;
  spot: string;
  avatar: string;
  rating?: number;
  reviewCount?: number;
  punctuality?: number;
  reliability?: number;
  communication?: number;
};

export type OpenErrand = {
  id: string;
  poster: string;
  initials: string;
  tint: string;
  rating: number;
  ago: string;
  reward: number;
  title: string;
  category: "Food & Drinks" | "Printing" | "Deliveries" | "Queueing" | "Academic Help";
  deliverLabel: string;
  deliverTo: string;
  urgency: string;
};

export type RunnerGig = {
  id: string;
  title: string;
  requester: string;
  reward: number;
  to: string;
  deadline: string;
  state: "IN PROGRESS" | "PICKED UP" | "PENDING REVIEW" | "COMPLETED";
};

export type Earning = {
  errand: string;
  order: string;
  date: string;
  reward: number;
  status: "Paid" | "Pending";
};

type Toast = { id: number; message: string };

type Store = {
  role: Role;
  setRole: (r: Role) => void;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => void;
  requests: ErrandRequest[];
  addRequest: (r: Omit<ErrandRequest, "id" | "posted" | "status">) => void;
  cancelRequest: (id: string) => void;
  history: HistoryItem[];
  openErrands: OpenErrand[];
  runnerGigs: RunnerGig[];
  earnings: Earning[];
  acceptGig: (id: string) => void;
  advanceGig: (id: string) => void;
  toasts: Toast[];
  pushToast: (message: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const initialRequests: ErrandRequest[] = [
  {
    id: "UP-9021",
    title: "Buy 2 Siomai Rice from Student Plaza(Sp)",
    status: "IN PROGRESS",
    to: "PTC Building, Maclab Room",
    posted: "Posted 10m ago",
    reward: 45,
    runner: {
      name: "Miguel Tan",
      note: "Is on the way",
      avatar: "/images/avatar-runner.png",
    },
  },
  {
    id: "UP-9025",
    title: "Pick up ID from Registrar Office",
    status: "LOOKING FOR RUNNER",
    to: "Engineering Bldg Room 102",
    posted: "Posted 2m ago",
    reward: 30,
  },
];

const initialHistory: HistoryItem[] = [
  { task: "Photocopy Bio Notes", by: "Sarah L.", emoji: "👩‍🎓", date: "Aug 24, 2024", amount: 30, status: "SUCCESS" },
  { task: "Milk Tea from 7/11", by: "Miguel T.", emoji: "🧑‍🎓", date: "Aug 22, 2024", amount: 55, status: "SUCCESS" },
  { task: "Print Thesis Chapter 3", by: "Andrea P.", emoji: "👩", date: "Aug 19, 2024", amount: 80, status: "SUCCESS" },
  { task: "Pick up Lab Gown", by: "Kyle R.", emoji: "🧑", date: "Aug 15, 2024", amount: 25, status: "CANCELLED" },
];

const initialOpenErrands: OpenErrand[] = [
  {
    id: "ERR-3001",
    poster: "Alicia Gomez",
    initials: "AG",
    tint: "bg-rose-100 text-rose-500",
    rating: 4.8,
    ago: "2 mins ago",
    reward: 75,
    title: "Buy 2 Buko Shakes at the Student Plaza",
    category: "Food & Drinks",
    deliverLabel: "Deliver to",
    deliverTo: "PTC Building - Room 302",
    urgency: "ASAP (within 20 mins)",
  },
  {
    id: "ERR-3002",
    poster: "Mark Rivera",
    initials: "MR",
    tint: "bg-emerald-100 text-emerald-600",
    rating: 5.0,
    ago: "12 mins ago",
    reward: 40,
    title: "Pick up printed documents from CMA Hallway",
    category: "Printing",
    deliverLabel: "Deliver to",
    deliverTo: "Main Library - Level 2",
    urgency: "By 1:30 PM Today",
  },
  {
    id: "ERR-3003",
    poster: "David Tan",
    initials: "DT",
    tint: "bg-sky-100 text-sky-600",
    rating: 4.5,
    ago: "25 mins ago",
    reward: 120,
    title: "Queue at Registrar for Document Release",
    category: "Queueing",
    deliverLabel: "Location",
    deliverTo: "Admin Building - Registrar",
    urgency: "Estimated Time: 45-60 mins",
  },
  {
    id: "ERR-3004",
    poster: "Nina Lopez",
    initials: "NL",
    tint: "bg-amber-100 text-amber-600",
    rating: 4.9,
    ago: "31 mins ago",
    reward: 60,
    title: "Return 3 Library Books (Main Library)",
    category: "Academic Help",
    deliverLabel: "Drop at",
    deliverTo: "Main Library - Circulation Desk",
    urgency: "Before 5:00 PM",
  },
  {
    id: "ERR-3005",
    poster: "Kyle Ramos",
    initials: "KR",
    tint: "bg-violet-100 text-violet-600",
    rating: 4.7,
    ago: "40 mins ago",
    reward: 55,
    title: "Deliver lab gown to Basic Ed Building",
    category: "Deliveries",
    deliverLabel: "Deliver to",
    deliverTo: "Basic Ed Building - Room 105",
    urgency: "Within 1 hour",
  },
  {
    id: "ERR-3006",
    poster: "Faith Cruz",
    initials: "FC",
    tint: "bg-orange-100 text-orange-600",
    rating: 4.6,
    ago: "48 mins ago",
    reward: 35,
    title: "Buy 1 Iced Coffee + Pandesal at Atrium",
    category: "Food & Drinks",
    deliverLabel: "Deliver to",
    deliverTo: "MBA Hall - Faculty Lounge",
    urgency: "ASAP (within 25 mins)",
  },
];

const initialRunnerGigs: RunnerGig[] = [
  {
    id: "GIG-8801",
    title: "2 Mango Graham Shakes at the Canteen",
    requester: "Alicia Gomez",
    reward: 75,
    to: "PTA Building - Room 302",
    deadline: "1:15 PM (10 mins left)",
    state: "IN PROGRESS",
  },
  {
    id: "GIG-8802",
    title: "Printed documents from Student Lounge",
    requester: "Mark Rivera",
    reward: 40,
    to: "Main Library - Level 2",
    deadline: "By 1:30 PM Today",
    state: "PICKED UP",
  },
  {
    id: "GIG-8790",
    title: "Grocery Run - Snack Corner",
    requester: "Ana Reyes",
    reward: 55,
    to: "CSDL Room 3",
    deadline: "Oct 24, 2023",
    state: "COMPLETED",
  },
  {
    id: "GIG-8788",
    title: "Hand-in Assignment (CMA Faculty)",
    requester: "Dr. Torres",
    reward: 30,
    to: "CMA Faculty Room",
    deadline: "Oct 23, 2023",
    state: "PENDING REVIEW",
  },
];

const initialEarnings: Earning[] = [
  { errand: "Grocery Run - Snack Corner", order: "Order #1284", date: "Oct 24, 2023", reward: 55, status: "Paid" },
  { errand: "Hand-in Assignment", order: "Order #1279", date: "Oct 23, 2023", reward: 30, status: "Paid" },
  { errand: "Print 12-page Case Study", order: "Order #1271", date: "Oct 22, 2023", reward: 60, status: "Paid" },
  { errand: "Queue at Cashier Window 3", order: "Order #1266", date: "Oct 21, 2023", reward: 110, status: "Pending" },
];

let nextId = 9030;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("student");
  const [requests, setRequests] = useState<ErrandRequest[]>(initialRequests);
  const [history] = useState<HistoryItem[]>(initialHistory);
  const [openErrands, setOpenErrands] = useState<OpenErrand[]>(initialOpenErrands);
  const [runnerGigs, setRunnerGigs] = useState<RunnerGig[]>(initialRunnerGigs);
  const [earnings] = useState<Earning[]>(initialEarnings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profile, setProfile] = useState<Profile>({
    name: "John Dela Cruz",
    program: "BS in Information Technology • 3rd Year",
    studentId: "2021-00456",
    email: "john.delacruz@phinmaed.com",
    phone: "0912 345 6789",
    spot: "Library Study Hall - 2nd Floor",
    avatar: "/images/avatar-john.png",
    rating: 4.8,
    reviewCount: 0,
    punctuality: 5,
    reliability: 5,
    communication: 5,
  });

  const pushToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const addRequest = useCallback<Store["addRequest"]>((r) => {
    setRequests((prev) => [
      {
        ...r,
        id: `UP-${nextId++}`,
        posted: "Posted just now",
        status: "LOOKING FOR RUNNER",
      },
      ...prev,
    ]);
  }, []);

  const cancelRequest = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  const acceptGig = useCallback((id: string) => {
    setOpenErrands((prev) => {
      const found = prev.find((e) => e.id === id);
      if (found) {
        setRunnerGigs((gigs) => [
          {
            id: `GIG-${nextId++}`,
            title: found.title,
            requester: found.poster,
            reward: found.reward,
            to: found.deliverTo,
            deadline: found.urgency,
            state: "IN PROGRESS",
          },
          ...gigs,
        ]);
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const advanceGig = useCallback((id: string) => {
    setRunnerGigs((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              state:
                g.state === "IN PROGRESS"
                  ? "PICKED UP"
                  : g.state === "PICKED UP"
                    ? "PENDING REVIEW"
                    : "COMPLETED",
            }
          : g,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      role,
      setRole,
      profile,
      updateProfile,
      requests,
      addRequest,
      cancelRequest,
      history,
      openErrands,
      runnerGigs,
      earnings,
      acceptGig,
      advanceGig,
      toasts,
      pushToast,
    }),
    [
      role,
      profile,
      updateProfile,
      requests,
      addRequest,
      cancelRequest,
      history,
      openErrands,
      runnerGigs,
      earnings,
      acceptGig,
      advanceGig,
      toasts,
      pushToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}