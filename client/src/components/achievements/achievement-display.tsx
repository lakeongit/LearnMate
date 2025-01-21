import { useState } from "react";
import {
  achievementBadges,
  rarityColors,
  rarityGradients,
  type AchievementRarity,
  type BadgeDefinition,
} from "./badge-icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import type { Achievement } from "@db/schema";

interface AchievementDisplayProps {
  unlockedAchievements: Achievement[];
  className?: string;
}

export function AchievementDisplay({
  unlockedAchievements,
  className = "",
}: AchievementDisplayProps) {
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | "all">(
    "all"
  );

  const filteredAchievements = Object.entries(achievementBadges).filter(
    ([id, badge]) =>
      selectedRarity === "all" || badge.rarity === selectedRarity
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedRarity("all")}
          className={`px-3 py-1 rounded-full text-sm ${
            selectedRarity === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          All
        </button>
        {(Object.keys(rarityColors) as AchievementRarity[]).map((rarity) => (
          <button
            key={rarity}
            onClick={() => setSelectedRarity(rarity)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              selectedRarity === rarity
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {rarity}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {filteredAchievements.map(([id, badge]) => {
            const isUnlocked = unlockedAchievements.some(
              (a) => a.name === badge.name
            );
            const Icon = badge.icon;

            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button
                      className={`w-full p-4 rounded-lg bg-gradient-to-br ${
                        rarityGradients[badge.rarity]
                      } border transition-transform hover:scale-105 ${
                        isUnlocked
                          ? "border-primary shadow-lg"
                          : "border-muted/50 opacity-50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`p-2 rounded-full ${
                            rarityColors[badge.rarity]
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium">{badge.name}</span>
                      </div>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">{badge.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {badge.description}
                      </p>
                      <div className="pt-2">
                        <div className="text-xs text-muted-foreground">
                          {isUnlocked ? "Unlocked!" : "Locked"}
                        </div>
                        <Progress
                          value={isUnlocked ? 100 : 0}
                          className="h-1"
                        />
                      </div>
                      <div className="pt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            rarityColors[badge.rarity]
                          }`}
                        >
                          {badge.rarity}
                        </span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
