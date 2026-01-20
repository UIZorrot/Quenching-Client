export const DiffPreviewWindow = reaxper((props:React.PropsWithChildren<DiffPreviewWindowProps>) => {
	
	
	return <div
		className = { classnames(less['diff-preview-window']) }
	>
		<div className = "bg-box">
			<div className={less['img-container']}>
				<img src = { props.imgUrl } className={less['diff-img']} />
			</div>
		</div>
	</div>;
})
export type DiffPreviewWindowProps = {
	imgUrl : string;
};
import classnames from 'classnames';
import * as less from './style/index.module.less';

