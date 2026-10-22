import { redirect } from 'next/navigation'

// Sprint 1: la raíz lleva al login del administrador.
// En Sprint 3 aquí irá el catálogo web público (HU-11).
export default function Home() {
  redirect('/login')
}
