import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Typography, message } from 'antd';
import { reaxper } from 'reaxes-react';

const { Title, Text } = Typography;

export const AppPages = reaxper(() => {
    const [war3Path, setWar3Path] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load initial path
        if (window.electronAPI?.getConfig) {
            window.electronAPI.getConfig('war3Path').then((path: string) => {
                if (path) setWar3Path(path);
            });
        }
    }, []);

    const handleSelectPath = async () => {
        if (!window.electronAPI?.selectGamePath) return;
        const path = await window.electronAPI.selectGamePath();
        if (path) {
            setWar3Path(path);
            message.success('Path selected: ' + path);
        }
    };

    const handleLaunch = async () => {
        if (!window.electronAPI?.launchGame) return;
        setLoading(true);
        try {
            const success = await window.electronAPI.launchGame();
            if (success) {
                message.success('Game launched successfully!');
            } else {
                message.error('Failed to launch game.');
            }
        } catch (e: any) {
            message.error('Launch error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <Card title="Quenching Mod Client (Phase 1)" bordered={false}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    
                    <div>
                        <Title level={4}>1. Game Path</Title>
                        <Space>
                            <Button onClick={handleSelectPath}>Select Warcraft III Folder</Button>
                            <Text code>{war3Path || 'Not selected'}</Text>
                        </Space>
                    </div>

                    <div>
                        <Title level={4}>2. Launch</Title>
                        <Button 
                            type="primary" 
                            size="large" 
                            onClick={handleLaunch} 
                            loading={loading}
                            disabled={!war3Path}
                        >
                            Start Game
                        </Button>
                    </div>

                </Space>
            </Card>
        </div>
    );
});
