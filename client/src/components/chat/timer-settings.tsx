import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Timer } from "lucide-react";

interface TimerSettingsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  breakInterval: number;
  onBreakIntervalChange: (interval: number) => void;
  breakDuration: number;
  onBreakDurationChange: (duration: number) => void;
  breakReminders: boolean;
  onBreakRemindersChange: (enabled: boolean) => void;
}

export function TimerSettings({
  duration,
  onDurationChange,
  breakInterval,
  onBreakIntervalChange,
  breakDuration,
  onBreakDurationChange,
  breakReminders,
  onBreakRemindersChange,
}: TimerSettingsProps) {
  const [localDuration, setLocalDuration] = useState(duration);
  const [localBreakInterval, setLocalBreakInterval] = useState(breakInterval);
  const [localBreakDuration, setLocalBreakDuration] = useState(breakDuration);

  const handleSave = () => {
    onDurationChange(localDuration);
    onBreakIntervalChange(localBreakInterval);
    onBreakDurationChange(localBreakDuration);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Study Timer Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Study Session Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="120"
              value={localDuration}
              onChange={(e) => setLocalDuration(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="break-reminders"
              checked={breakReminders}
              onCheckedChange={onBreakRemindersChange}
            />
            <Label htmlFor="break-reminders">Enable Break Reminders</Label>
          </div>

          {breakReminders && (
            <>
              <div className="space-y-2">
                <Label htmlFor="break-interval">Break Interval (minutes)</Label>
                <Input
                  id="break-interval"
                  type="number"
                  min="1"
                  max="60"
                  value={localBreakInterval}
                  onChange={(e) => setLocalBreakInterval(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                <Input
                  id="break-duration"
                  type="number"
                  min="1"
                  max="30"
                  value={localBreakDuration}
                  onChange={(e) => setLocalBreakDuration(Number(e.target.value))}
                />
              </div>
            </>
          )}

          <Button className="w-full" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
