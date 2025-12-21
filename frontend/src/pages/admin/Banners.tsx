import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material'
import { adminAPI, Banner, BannerCreate, BannerUpdate } from '../../services/adminAPI'

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState<BannerCreate>({
    title: '',
    description: '',
    image_url: '',
    order: 0,
    is_active: true,
  })

  useEffect(() => {
    loadBanners()
  }, [])

  const loadBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminAPI.getBanners()
      setBanners(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner)
      setFormData({
        title: banner.title,
        description: banner.description || '',
        image_url: banner.image_url || '',
        order: banner.order,
        is_active: banner.is_active,
      })
    } else {
      setEditingBanner(null)
      setFormData({
        title: '',
        description: '',
        image_url: '',
        order: banners.length,
        is_active: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingBanner(null)
    setFormData({
      title: '',
      description: '',
      image_url: '',
      order: 0,
      is_active: true,
    })
  }

  const handleSubmit = async () => {
    try {
      if (editingBanner) {
        await adminAPI.updateBanner(editingBanner.id, formData as BannerUpdate)
      } else {
        await adminAPI.createBanner(formData)
      }
      handleCloseDialog()
      loadBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save banner')
    }
  }

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return
    }
    try {
      await adminAPI.deleteBanner(bannerId)
      loadBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete banner')
    }
  }

  const handleOrderChange = async (bannerId: string, direction: 'up' | 'down') => {
    const banner = banners.find(b => b.id === bannerId)
    if (!banner) return

    const currentIndex = banners.findIndex(b => b.id === bannerId)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= banners.length) return

    const newOrder = banners[newIndex].order
    const otherOrder = banner.order

    try {
      await adminAPI.updateBanner(bannerId, { order: newOrder })
      await adminAPI.updateBanner(banners[newIndex].id, { order: otherOrder })
      loadBanners()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update order')
    }
  }

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Banner Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Banner
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banners.map((banner, index) => (
              <TableRow key={banner.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOrderChange(banner.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <Typography variant="body2">{banner.order}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleOrderChange(banner.id, 'down')}
                      disabled={index === banners.length - 1}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
                <TableCell>{banner.title}</TableCell>
                <TableCell>
                  {banner.image_url ? (
                    <Box
                      component="img"
                      src={banner.image_url}
                      alt={banner.title}
                      sx={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={banner.is_active ? 'Active' : 'Inactive'}
                    color={banner.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(banner)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(banner.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No banners found. Create your first banner to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBanner ? 'Edit Banner' : 'Create Banner'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Image URL"
              fullWidth
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            <TextField
              label="Order"
              type="number"
              fullWidth
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
            {editingBanner ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
