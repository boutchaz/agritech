'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateListing } from '@/hooks/useListings';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import ProductImageUpload from '@/components/ProductImageUpload';

export default function NewListingPage() {
    const router = useRouter();
    const { signOut } = useAuth();
    const [error, setError] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        short_description: '',
        price: '',
        unit: 'kg',
        quantity_available: '',
        sku: '',
    });

    const createListing = useCreateListing();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('Le titre est requis');
            return;
        }

        if (!formData.description.trim()) {
            setError('La description est requise');
            return;
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            setError('Le prix doit être supérieur à 0');
            return;
        }

        try {
            await createListing.mutateAsync({
                title: formData.title,
                description: formData.description,
                short_description: formData.short_description || formData.description.substring(0, 150),
                price: parseFloat(formData.price),
                unit: formData.unit,
                quantity_available: formData.quantity_available ? parseFloat(formData.quantity_available) : undefined,
                sku: formData.sku || undefined,
                images: images.length > 0 ? images : undefined,
            });

            router.push('/dashboard/listings?created=true');
        } catch (err: any) {
            setError(err.message || 'Échec de la création de l\'annonce');
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <span className="text-2xl">🌱</span>
                            <span className="text-xl font-bold text-green-700">AgriTech Market</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard/listings" className="text-gray-700 hover:text-green-700 flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour aux annonces
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
                            >
                                <LogOut className="h-4 w-4" />
                                <span className="text-sm">Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Nouvelle Annonce</h1>
                    <p className="text-gray-600">Créez une nouvelle annonce pour vendre vos produits</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                Titre du produit <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="title"
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="ex: Tomates fraîches Bio"
                            />
                        </div>

                        {/* Short Description */}
                        <div>
                            <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description courte
                            </label>
                            <input
                                id="short_description"
                                type="text"
                                value={formData.short_description}
                                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Bref résumé (facultatif)"
                                maxLength={150}
                            />
                            <p className="text-sm text-gray-500 mt-1">Maximum 150 caractères</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description détaillée <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="description"
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Décrivez votre produit en détail..."
                            />
                        </div>

                        {/* Price and Unit */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                                    Prix (MAD) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                                    Unité <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="unit"
                                    required
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="kg">Kilogramme (kg)</option>
                                    <option value="g">Gramme (g)</option>
                                    <option value="t">Tonne (t)</option>
                                    <option value="l">Litre (l)</option>
                                    <option value="ml">Millilitre (ml)</option>
                                    <option value="unit">Unité</option>
                                    <option value="box">Caisse</option>
                                    <option value="bag">Sac</option>
                                </select>
                            </div>
                        </div>

                        {/* Optional Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantity_available" className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantité disponible
                                </label>
                                <input
                                    id="quantity_available"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.quantity_available}
                                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Optionnel"
                                />
                            </div>

                            <div>
                                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                                    SKU / Référence
                                </label>
                                <input
                                    id="sku"
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Optionnel"
                                />
                            </div>
                        </div>

                        {/* Product Images */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Images du produit
                            </label>
                            <ProductImageUpload
                                images={images}
                                onImagesChange={setImages}
                                maxImages={5}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                La première image sera l'image principale affichée sur le marketplace.
                            </p>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={createListing.isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                            >
                                {createListing.isPending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Création en cours...
                                    </>
                                ) : (
                                    'Créer l\'annonce'
                                )}
                            </button>
                            <Link
                                href="/dashboard/listings"
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-green-600 hover:text-green-700 transition font-semibold"
                            >
                                Annuler
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
