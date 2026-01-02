import { useState, useEffect } from 'react'
import { MoreVertical, Edit, Trash2, Search } from 'lucide-react'
import { adminAPI, UserListParams, UserUpdate } from '../../services/adminAPI'
import { User } from '../../services/api'
import Container from '../../components/ui/Container'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Dropdown from '../../components/ui/Dropdown'
import DropdownItem from '../../components/ui/DropdownItem'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalUsers, setTotalUsers] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editData, setEditData] = useState<UserUpdate>({})

  useEffect(() => {
    loadUsers()
  }, [page, rowsPerPage, search])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: UserListParams = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
      }
      if (search) {
        params.search = search
      }
      const data = await adminAPI.getUsers(params)
      setUsers(data)
      // In a real app, you'd get total from API
      setTotalUsers(data.length)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClose = () => {
    setSelectedUser(null)
  }

  const handleEdit = () => {
    if (selectedUser) {
      setEditData({
        full_name: selectedUser.full_name,
        phone_number: selectedUser.phone_number,
        user_type: selectedUser.user_type,
        is_active: selectedUser.is_active,
        is_verified: selectedUser.is_verified,
        role: selectedUser.role,
      })
      setEditDialogOpen(true)
    }
    handleMenuClose()
  }

  const handleSave = async () => {
    if (!selectedUser) return
    try {
      await adminAPI.updateUser(selectedUser.id, editData)
      setEditDialogOpen(false)
      loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user')
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await adminAPI.deleteUser(selectedUser.id)
      handleMenuClose()
      loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  return (
    <Container maxWidth="xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">Manage users and their permissions</p>
        </div>
      </div>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="p-4 mb-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone_number || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700">
                          {user.user_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          user.role === 'admin' || user.role === 'super_admin'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {user.is_verified && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Dropdown
                          trigger={
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          }
                        >
                          <DropdownItem onClick={handleEdit}>
                            <div className="flex items-center gap-3">
                              <Edit className="w-4 h-4" />
                              Edit
                            </div>
                          </DropdownItem>
                          <div className="border-t border-gray-200 my-1"></div>
                          <DropdownItem onClick={handleDelete}>
                            <div className="flex items-center gap-3 text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </div>
                          </DropdownItem>
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10))
                    setPage(0)
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * rowsPerPage >= totalUsers}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit User"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={editData.full_name || ''}
            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
          />
          <Input
            label="Phone Number"
            value={editData.phone_number || ''}
            onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
            <select
              value={editData.user_type || ''}
              onChange={(e) => setEditData({ ...editData, user_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="individual">Individual</option>
              <option value="freelancer">Freelancer</option>
              <option value="micro_business">Micro Business</option>
              <option value="sme">SME</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={editData.role || 'user'}
              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="user">User</option>
              <option value="support">Support</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editData.is_active ?? true}
                onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editData.is_verified ?? false}
                onChange={(e) => setEditData({ ...editData, is_verified: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Verified</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  )
}
