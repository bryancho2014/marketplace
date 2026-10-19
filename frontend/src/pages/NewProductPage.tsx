
import { Navigate } from 'react-router-dom'

import CreateProductForm from '../components/CreateProductForm'
import { useAuth } from '../contexts/AuthContext'

function NewProductPage() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <CreateProductForm />
}

export default NewProductPage