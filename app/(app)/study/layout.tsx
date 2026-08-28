import { PomodoroTimer } from "@/components/study/pomodoro-timer";

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<PomodoroTimer /></>;
}
