import {requireRole} from '../../lib/auth';
export default async function PujariGuard({children}:{children:React.ReactNode}){await requireRole('PUJARI');return children}
