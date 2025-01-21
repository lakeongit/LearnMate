import type { LucideIcon } from "lucide-react";
import { 
  Brain, 
  Star, 
  Trophy, 
  Target, 
  Flame,
  Zap,
  Award,
  Medal,
  Crown,
  Sparkles
} from "lucide-react";

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface BadgeDefinition {
  name: string;
  description: string;
  icon: LucideIcon;
  criteria: string;
  rarity: AchievementRarity;
}

// Define all achievement badges
export const achievementBadges: Record<string, BadgeDefinition> = {
  first_session: {
    name: "First Step",
    description: "Complete your first learning session",
    icon: Star,
    criteria: "Complete one learning session",
    rarity: "common"
  },
  quick_learner: {
    name: "Quick Learner",
    description: "Complete 5 learning sessions",
    icon: Zap,
    criteria: "Complete 5 learning sessions",
    rarity: "common"
  },
  knowledge_seeker: {
    name: "Knowledge Seeker",
    description: "Study 3 different subjects",
    icon: Brain,
    criteria: "Engage with 3 different subjects",
    rarity: "rare"
  },
  master_student: {
    name: "Master Student",
    description: "Complete 20 learning sessions",
    icon: Trophy,
    criteria: "Complete 20 learning sessions",
    rarity: "epic"
  },
  subject_expert: {
    name: "Subject Expert",
    description: "Achieve high mastery in one subject",
    icon: Medal,
    criteria: "Reach 90% mastery in any subject",
    rarity: "epic"
  },
  academic_champion: {
    name: "Academic Champion",
    description: "Master multiple subjects",
    icon: Crown,
    criteria: "Reach 80% mastery in 3 subjects",
    rarity: "legendary"
  },
  consistent_learner: {
    name: "Consistent Learner",
    description: "Study for 7 days in a row",
    icon: Flame,
    criteria: "Login and study for 7 consecutive days",
    rarity: "rare"
  },
  goal_achiever: {
    name: "Goal Achiever",
    description: "Complete all goals in a learning plan",
    icon: Target,
    criteria: "Complete all goals in any learning plan",
    rarity: "epic"
  },
  top_performer: {
    name: "Top Performer",
    description: "Achieve perfect scores in assessments",
    icon: Sparkles,
    criteria: "Get 100% in 5 assessments",
    rarity: "legendary"
  },
  dedicated_learner: {
    name: "Dedicated Learner",
    description: "Spend significant time learning",
    icon: Award,
    criteria: "Accumulate 50 hours of study time",
    rarity: "rare"
  },
};

export const rarityColors: Record<AchievementRarity, string> = {
  common: "bg-slate-200 text-slate-700",
  rare: "bg-blue-200 text-blue-700",
  epic: "bg-purple-200 text-purple-700",
  legendary: "bg-amber-200 text-amber-700",
};

export const rarityGradients: Record<AchievementRarity, string> = {
  common: "from-slate-50 to-slate-200",
  rare: "from-blue-50 to-blue-200",
  epic: "from-purple-50 to-purple-200",
  legendary: "from-amber-50 to-amber-200",
};
