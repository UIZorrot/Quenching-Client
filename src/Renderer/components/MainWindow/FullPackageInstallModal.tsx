import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { ArrowRightOutlined, CheckOutlined, DownloadOutlined, FileZipOutlined, FolderOpenOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from '../../utils/i18n';
import { GameChannel, gameChannelFolder } from '../../../shared/game-channel';

interface Props {
  open: boolean;
  onClose: () => void;
  war3Path: string;
  channel: GameChannel;
  installing: boolean;
  isFullPackageInstalled?: boolean;
  onChooseDirectory: () => Promise<boolean>;
  onConfirmDirectory: () => Promise<boolean>;
  onInstall: (source: 'zip' | 'folder') => Promise<boolean>;
  onDownload: () => Promise<void>;
}

export const FullPackageInstallModal: React.FC<Props> = ({
  open, onClose, war3Path, channel, installing, isFullPackageInstalled = false,
  onChooseDirectory, onConfirmDirectory, onInstall, onDownload,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'directory' | 'package'>('directory');
  const [pending, setPending] = useState(false);
  const [activeSource, setActiveSource] = useState<'zip' | 'folder' | null>(null);
  useEffect(() => { if (open) setStep(war3Path ? 'package' : 'directory'); }, [open]);
  const busy = pending || installing;
  const confirmDirectory = async (choose: boolean) => {
    setPending(true);
    try {
      if (await (choose ? onChooseDirectory() : onConfirmDirectory())) setStep('package');
    } finally { setPending(false); }
  };
  const install = async (source: 'zip' | 'folder') => {
    setActiveSource(source);
    setPending(true);
    try { if (await onInstall(source)) onClose(); }
    finally { setPending(false); setActiveSource(null); }
  };
  const target = `${war3Path.replace(/[\\/]+$/, '')}${war3Path.includes('\\') ? '\\' : '/'}${gameChannelFolder(channel)}`;

  return (
    <Modal open={open} centered width={660} footer={null} className="full-package-install-modal"
      title={t(isFullPackageInstalled ? 'main.home.reinstallFullPackage' : 'main.home.installFullPackage')} onCancel={onClose}
      closable={!busy} maskClosable={!busy} keyboard={!busy}>
      <ol className="full-package-install-steps" aria-label={t('install.fullPackage.steps')}>
        <li className={step === 'directory' ? 'is-active' : 'is-complete'} aria-current={step === 'directory' ? 'step' : undefined}>
          <span className="full-package-step-index">{step === 'directory' ? '1' : <CheckOutlined />}</span>
          <span>{t('main.home.chooseWar3Directory')}</span>
        </li>
        <li className={step !== 'directory' ? 'is-active' : ''} aria-current={step !== 'directory' ? 'step' : undefined}>
          <span className="full-package-step-index">2</span><span>{t('install.fullPackage.choosePackage')}</span>
        </li>
      </ol>
      {step === 'directory' ? (
        <section className="full-package-install-step">
          <p>{t('install.fullPackage.directoryHint')}</p>
          {war3Path && <div className="full-package-install-target"><FolderOpenOutlined /><code>{war3Path}</code></div>}
          <div className="full-package-install-actions">
            <Button type="primary" icon={<FolderOpenOutlined />} disabled={busy}
              loading={pending} onClick={() => void confirmDirectory(!war3Path)}>
              {war3Path ? t('install.fullPackage.useDirectory') : t('main.home.chooseWar3Directory')}
            </Button>
            {war3Path && <Button disabled={busy} onClick={() => void confirmDirectory(true)}>
              {t('install.fullPackage.changeDirectory')}
            </Button>}
          </div>
        </section>
      ) : (
        <section className="full-package-install-step">
          <div className="full-package-install-target">
            <div className="full-package-target-heading">
              <span><FolderOpenOutlined />{t('install.fullPackage.target')}</span>
              <span className="full-package-target-branch">{channel === 'ptr' ? 'PTR' : 'Retail'}</span>
              <button type="button" disabled={busy} onClick={() => void confirmDirectory(true)}>
                {t('install.fullPackage.changeDirectory')}
              </button>
            </div>
            <code>{target}</code>
          </div>
          <div className="full-package-install-source-heading">
            <h3>{t('install.fullPackage.choosePackage')}</h3>
            <p>{t('install.fullPackage.zipHint')}</p>
          </div>
          <div className="full-package-install-sources">
            {(['zip', 'folder'] as const).map(source => (
              <button key={source} type="button" className="full-package-source-card" disabled={busy}
                onClick={() => void install(source)}>
                <span className="full-package-source-icon">
                  {pending && activeSource === source ? <LoadingOutlined /> : source === 'zip' ? <FileZipOutlined /> : <FolderOpenOutlined />}
                </span>
                <span className="full-package-source-description">
                  <strong>{t(source === 'zip' ? 'install.fullPackage.zipSource' : 'install.fullPackage.folderSource')}</strong>
                  <small>{t(source === 'zip' ? 'install.fullPackage.zipSourceHint' : 'install.fullPackage.folderSourceHint')}</small>
                </span>
                <ArrowRightOutlined className="full-package-source-arrow" />
              </button>
            ))}
          </div>
        </section>
      )}
      <footer className="full-package-install-footer">
        {step === 'package' ? <button type="button" className="full-package-install-back" disabled={busy}
          onClick={() => setStep('directory')}>{t('install.fullPackage.back')}</button> : <span />}
        <div className="full-package-install-download">
          <span>{t('install.fullPackage.needDownload')}</span>
          <button type="button" disabled={busy} onClick={() => void onDownload()}>
            <DownloadOutlined />{t('main.home.openDownload')}
          </button>
        </div>
      </footer>
    </Modal>
  );
};
