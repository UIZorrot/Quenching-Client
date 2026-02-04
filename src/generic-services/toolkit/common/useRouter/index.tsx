export const useRouter = () => {
	return {
		navigate : useNavigate() ,
		params : useParams() ,
		hash : useLocation() ,
	};
};
import {
	useLocation ,
	useNavigate ,
	useParams ,
} from 'react-router-dom';
