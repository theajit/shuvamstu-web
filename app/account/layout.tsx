import {requireRole} from '../../lib/auth';
export default async function AccountGuard({children}:{children:React.ReactNode}){await requireRole('CUSTOMER');return children}
