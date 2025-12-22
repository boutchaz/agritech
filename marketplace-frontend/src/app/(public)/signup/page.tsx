'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Building2, Tractor, Loader2, Leaf } from 'lucide-react';
import { ApiClient } from '@/lib/api';

type SellerType = 'individual' | 'business' | 'farm';

const sellerTypeOptions = [
    {
        value: 'individual' as SellerType,
        label: 'Particulier',
        description: 'Je vends en tant que personne individuelle',
        icon: User,
    },
    {
        value: 'business' as SellerType,
        label: 'Entreprise',
        description: 'Je represente une societe ou cooperative',
        icon: Building2,
    },
    {
        value: 'farm' as SellerType,
        label: 'Ferme / Exploitation',
        description: 'Je gere une exploitation agricole',
        icon: Tractor,
    },
];

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        sellerType: 'individual' as SellerType,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caracteres');
            return;
        }

        if (!formData.displayName.trim()) {
            setError('Veuillez entrer votre nom');
            return;
        }

        setLoading(true);

        try {
            await ApiClient.signup({
                email: formData.email,
                password: formData.password,
                displayName: formData.displayName,
                sellerType: formData.sellerType,
            });
            router.push('/login?registered=true');
        } catch (err: any) {
            setError(err.message || 'Echec de la creation du compte');
        } finally {
            setLoading(false);
        }
    };

    const getNameLabel = () => {
        switch (formData.sellerType) {
            case 'individual':
                return 'Votre nom';
            case 'business':
                return "Nom de l'entreprise";
            case 'farm':
                return "Nom de la ferme / exploitation";
        }
    };

    const getNamePlaceholder = () => {
        switch (formData.sellerType) {
            case 'individual':
                return 'ex: Ahmed Benali';
            case 'business':
                return 'ex: Cooperative Al Baraka';
            case 'farm':
                return 'ex: Ferme Verte de Meknes';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center items-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                        <Leaf className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">AgriTech Market</span>
                </Link>
                <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
                    Creer un compte
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Vous avez deja un compte?{' '}
                    <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                        Se connecter
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Seller Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Je suis
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {sellerTypeOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isSelected = formData.sellerType === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, sellerType: option.value })}
                                            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                                                isSelected
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                        >
                                            <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                                            <span className="text-sm font-medium">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-2 text-xs text-gray-500 text-center">
                                {sellerTypeOptions.find(o => o.value === formData.sellerType)?.description}
                            </p>
                        </div>

                        {/* Display Name */}
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                                {getNameLabel()} <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    required
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder={getNamePlaceholder()}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Adresse email <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="vous@exemple.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Mot de passe <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Minimum 8 caracteres"
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirmer le mot de passe <span className="text-red-500">*</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    placeholder="Retapez votre mot de passe"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creation en cours...
                                    </>
                                ) : (
                                    'Creer mon compte'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <p className="text-center text-xs text-gray-500">
                            En vous inscrivant, vous acceptez nos{' '}
                            <Link href="/terms" className="text-green-600 hover:underline">
                                Conditions d'utilisation
                            </Link>{' '}
                            et notre{' '}
                            <Link href="/privacy" className="text-green-600 hover:underline">
                                Politique de confidentialite
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
