import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from '@mui/material'
import {
  MoreVert,
  Edit,
  Delete,
  Search,
} from '@mui/icons-material'
import { adminAPI, UserListParams, UserUpdate } from '../../services/adminAPI'
import { User } from '../../services/api'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalUsers, setTotalUsers] = useState(0)
  const [search, setSearch] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget)
    setSelectedUser(user)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users and their permissions
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search users by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone_number || '-'}</TableCell>
                    <TableCell>
                      <Chip label={user.user_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role || 'user'} 
                        size="small" 
                        color={user.role === 'admin' || user.role === 'super_admin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.is_active ? 'success' : 'default'}
                        />
                        {user.is_verified && (
                          <Chip label="Verified" size="small" color="info" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, user)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalUsers}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10))
                setPage(0)
              }}
            />
          </>
        )}
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={editData.full_name || ''}
              onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={editData.phone_number || ''}
              onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select
                value={editData.user_type || ''}
                label="User Type"
                onChange={(e) => setEditData({ ...editData, user_type: e.target.value })}
              >
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="freelancer">Freelancer</MenuItem>
                <MenuItem value="micro_business">Micro Business</MenuItem>
                <MenuItem value="sme">SME</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editData.role || 'user'}
                label="Role"
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="support">Support</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={editData.is_active ?? true}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editData.is_verified ?? false}
                  onChange={(e) => setEditData({ ...editData, is_verified: e.target.checked })}
                />
              }
              label="Verified"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
