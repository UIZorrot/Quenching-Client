import React from 'react';
import { env } from '#renderer/ENV';
import "./dom-listeners";
import './ipc-listeners';
import { Routing } from '#renderer/routes';
import { createRoot } from "react-dom/client";
import './styles/index.less';
import './styles/global.module.less';
import './styles/overwrite.antd.less';
import './styles/global.css';
import App from './App';

const root = createRoot(document.getElementById("react-app-root"));

// 错误边界组件
class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; error?: Error }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('React Error Boundary caught an error:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100vh',
					background: '#000',
					color: '#fff',
					fontFamily: 'Arial, sans-serif',
					padding: '20px',
					textAlign: 'center'
				}}>
					<h1 style={{ color: '#ff4d4f', marginBottom: '20px' }}>
						应用程序出现错误
					</h1>
					<p style={{ marginBottom: '20px', maxWidth: '600px' }}>
						淬火试炼遇到了一个意外错误。请重启应用程序，如果问题持续存在，请联系技术支持。
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							marginTop: '20px',
							padding: '10px 20px',
							background: '#ffd700',
							color: '#000',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
							fontSize: '14px'
						}}
					>
						重新加载应用
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

root.render(
	<React.StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</React.StrictMode>
);


