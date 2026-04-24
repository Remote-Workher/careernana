export interface CourseCategory {
  id: string;
  name: string;
  count: number;
  emoji: string;
  tone: "pink" | "violet" | "amber" | "green" | "blue" | "rose";
}

export interface Course {
  id: string;
  title: string;
  category: string;
  categoryTone: CourseCategory["tone"];
  instructor: string;
  instructorAvatar: string;
  rating: number;
  reviews: number;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  price: number; // 0 = free with Hub
  priceNaira?: number; // one-time purchase price for non-members
  cover: string;
  featured?: boolean;
}

export interface ContinueItem {
  id: string;
  course: string;
  progressLessons: string; // "8 of 12 lessons completed"
  progressPct: number;
  lastAccessedLabel: string;
  lastAccessedTime: string;
  cover: string;
}

export interface RecommendedItem {
  id: string;
  title: string;
  author: string;
  rating: number;
  reviews: number;
  price: number; // 0 = free
  cover: string;
}

export const courseCategories: CourseCategory[] = [
  { id: "career", name: "Career Development", count: 24, emoji: "🚀", tone: "pink" },
  { id: "remote", name: "Remote Work Skills", count: 18, emoji: "💻", tone: "violet" },
  { id: "tech", name: "Tech & Digital Skills", count: 32, emoji: "⚙️", tone: "green" },
  { id: "biz", name: "Business & Productivity", count: 16, emoji: "📊", tone: "amber" },
  { id: "marketing", name: "Marketing & Growth", count: 20, emoji: "📣", tone: "rose" },
  { id: "design", name: "Design", count: 14, emoji: "🎨", tone: "blue" },
];

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&q=80`;

export const featuredCourse = {
  id: "feat-1",
  eyebrow: "Continue Learning",
  title: "Remote Work Essentials: Get Started and Succeed",
  progressPct: 60,
  cover: img("photo-1573497019940-1c28c88b4f3e"),
};

export const courses: Course[] = [
  {
    id: "c1",
    title: "Landing Your First Remote Job: Complete Guide",
    category: "Career Development",
    categoryTone: "pink",
    instructor: "Priya Sharma",
    instructorAvatar: img("photo-1494790108377-be9c29b29330"),
    rating: 4.8,
    reviews: 1200,
    lessons: 6,
    level: "Beginner",
    price: 0,
    cover: img("photo-1573496359142-b8d87734a5a2"),
  },
  {
    id: "c2",
    title: "Mastering Remote Communication: Work Effectively from Anywhere",
    category: "Remote Work Skills",
    categoryTone: "violet",
    instructor: "Rahul Mehta",
    instructorAvatar: img("photo-1500648767791-00dcc994a43e"),
    rating: 4.7,
    reviews: 892,
    lessons: 8,
    level: "Beginner",
    price: 0,
    cover: img("photo-1521737604893-d14cc237f11d"),
  },
  {
    id: "c3",
    title: "Time Management for Remote Workers: Boost Productivity",
    category: "Business & Productivity",
    categoryTone: "amber",
    instructor: "Ananya Verma",
    instructorAvatar: img("photo-1438761681033-6461ffad8d80"),
    rating: 4.9,
    reviews: 1100,
    lessons: 7,
    level: "Intermediate",
    price: 12000,
    priceNaira: 12000,
    cover: img("photo-1506784983877-45594efa4cbe"),
  },
  {
    id: "c4",
    title: "Canva for Professionals: Design Like a Pro",
    category: "Design",
    categoryTone: "blue",
    instructor: "Neha Kapoor",
    instructorAvatar: img("photo-1544005313-94ddf0286df2"),
    rating: 4.8,
    reviews: 756,
    lessons: 10,
    level: "Beginner",
    price: 9500,
    priceNaira: 9500,
    cover: img("photo-1561070791-2526d30994b8"),
  },
  {
    id: "c5",
    title: "LinkedIn Profile That Gets You Hired: Stand Out & Get Noticed",
    category: "Career Development",
    categoryTone: "pink",
    instructor: "Sneha Iyer",
    instructorAvatar: img("photo-1487412720507-e7ab37603c6f"),
    rating: 4.7,
    reviews: 630,
    lessons: 5,
    level: "Beginner",
    price: 7500,
    priceNaira: 7500,
    cover: img("photo-1611944212129-29977ae1398c"),
  },
  {
    id: "c6",
    title: "Excel for Remote Professionals: Data Mastery",
    category: "Tech & Digital Skills",
    categoryTone: "green",
    instructor: "Tobi Adeyemi",
    instructorAvatar: img("photo-1531123897727-8f129e1688ce"),
    rating: 4.6,
    reviews: 540,
    lessons: 12,
    level: "Intermediate",
    price: 11000,
    priceNaira: 11000,
    cover: img("photo-1551288049-bebda4e38f71"),
  },
];

export const continueLearning: ContinueItem[] = [
  {
    id: "k1",
    course: "Remote Work Essentials: Get Started and Succeed",
    progressLessons: "8 of 12 lessons completed",
    progressPct: 60,
    lastAccessedLabel: "Today",
    lastAccessedTime: "2:30 PM",
    cover: img("photo-1573497019940-1c28c88b4f3e"),
  },
  {
    id: "k2",
    course: "Excel for Remote Professionals",
    progressLessons: "5 of 15 lessons completed",
    progressPct: 33,
    lastAccessedLabel: "Yesterday",
    lastAccessedTime: "10:15 AM",
    cover: img("photo-1551288049-bebda4e38f71"),
  },
  {
    id: "k3",
    course: "Effective Email Writing",
    progressLessons: "3 of 10 lessons completed",
    progressPct: 30,
    lastAccessedLabel: "Apr 18, 2026",
    lastAccessedTime: "4:45 PM",
    cover: img("photo-1486312338219-ce68d2c6f44d"),
  },
];

export const recommendedCourses: RecommendedItem[] = [
  {
    id: "r1",
    title: "Resume That Gets You Hired",
    author: "Priya Sharma",
    rating: 4.8,
    reviews: 1300,
    price: 0,
    cover: img("photo-1586281380349-632531db7ed4"),
  },
  {
    id: "r2",
    title: "Interview Confidence Mastery",
    author: "Rahul Mehta",
    rating: 4.7,
    reviews: 890,
    price: 6500,
    cover: img("photo-1573497019418-b400bb3ab074"),
  },
  {
    id: "r3",
    title: "Productivity Hacks for Remote Workers",
    author: "Ananya Verma",
    rating: 4.6,
    reviews: 620,
    price: 0,
    cover: img("photo-1499750310107-5fef28a66643"),
  },
];

export const learningProgress = {
  enrolled: 5,
  lessonsCompleted: 12,
  timeSpent: "8h 20m",
  weeklyGoalDone: 3,
  weeklyGoalTotal: 6,
};

export const achievements = {
  enrolled: 5,
  certificates: 3,
  topPercent: "Top 10%",
};
