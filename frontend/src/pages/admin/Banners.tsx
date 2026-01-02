import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { adminAPI, Banner, BannerCreate, BannerUpdate } from '../../services/adminAPI'
import Container from '../../components/ui/Container'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

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
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Banner Management</h1>
        <Button
          variant="primary"
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Banner
        </Button>
      </div>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {banners.map((banner, index) => (
                <tr key={banner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOrderChange(banner.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <span className="text-sm">{banner.order}</span>
                      <button
                        onClick={() => handleOrderChange(banner.id, 'down')}
                        disabled={index === banners.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{banner.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenDialog(banner)}
                        className="p-1 text-primary hover:text-primary-dark"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No banners found. Create your first banner to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editingBanner ? 'Edit Banner' : 'Create Banner'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
            />
          </div>
          <Input
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
          <Input
            label="Order"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!formData.title}>
              {editingBanner ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </Container>
  )
}
