import React, { ReactNode } from 'react';
import { ArrowRightOutlined, CheckCircleFilled, CopyOutlined } from '@ant-design/icons';

/** Numbered in-game steps shown before the unlock map is started from Custom Game. */
export const CampaignUnlockSteps: React.FC<{ lead: string; steps: string[] }> = ({ lead, steps }) => (
  <div className="campaign-unlock-guide">
    <div className="campaign-unlock-lead">{lead}</div>
    <ol className="campaign-unlock-steps">
      {steps.map((step, index) => (
        <li key={step} className="campaign-unlock-step">
          <span className="campaign-unlock-step-index">{index + 1}</span>
          <ArrowRightOutlined className="campaign-unlock-step-arrow" />
          <span>{step}</span>
        </li>
      ))}
    </ol>
  </div>
);

const LoadingTitle: React.FC<{ icon: ReactNode; text: string }> = ({ icon, text }) => (
  <span className="campaign-unlock-copy-title">{icon}{text}</span>
);

type ShowLoading = (message: ReactNode, percent?: number, detail?: string) => void;

const COPY_STEP_PERCENT = 10;
const COPY_STEP_MS = 90;
const COPIED_HOLD_MS = 1500;

/** Short copy progress (map -> user maps folder), then a "copied" state held long enough to read. */
export function playUnlockCopyProgress(
  showLoading: ShowLoading,
  labels: { copying: string; copied: string; target: string },
): Promise<void> {
  const copyingTitle = <LoadingTitle icon={<CopyOutlined className="campaign-unlock-copy-icon is-busy" />} text={labels.copying} />;
  const copiedTitle = <LoadingTitle icon={<CheckCircleFilled className="campaign-unlock-copy-icon" />} text={labels.copied} />;
  return new Promise((resolve) => {
    let percent = 0;
    showLoading(copyingTitle, percent, labels.target);
    const timer = setInterval(() => {
      percent = Math.min(100, percent + COPY_STEP_PERCENT);
      showLoading(copyingTitle, percent, labels.target);
      if (percent < 100) return;
      clearInterval(timer);
      showLoading(copiedTitle, 100, labels.target);
      setTimeout(resolve, COPIED_HOLD_MS);
    }, COPY_STEP_MS);
  });
}
