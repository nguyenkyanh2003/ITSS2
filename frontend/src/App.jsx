import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users')
        if (isMounted) {
          setUsers(response.data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load users')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="App">
      <h1>Danh sach nguoi dung</h1>
      {isLoading && <p>Dang tai du lieu...</p>}
      {!isLoading && error && <p>{error}</p>}
      {!isLoading && !error && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name} - {user.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
