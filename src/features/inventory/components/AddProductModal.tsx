import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: { name: string; category?: string; location?: string; currentQty?: number; minStockQty?: number; unit?: string }) => void;
}

export function AddProductModal({ isOpen, onClose, onAdd }: AddProductModalProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitType, setUnitType] = useState('Units');
    const [threshold, setThreshold] = useState('5');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            name,
            category,
            currentQty: Number(quantity),
            unit: unitType,
            minStockQty: Number(threshold),
        });
        // Reset
        setName('');
        setCategory('');
        setQuantity('');
        setUnitType('Units');
        setThreshold('5');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Product">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    This inventory is global for your company and available across your projects.
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Product Name</label>
                    <Input
                        placeholder="e.g. Concrete Mix, Steel Bars"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Category</label>
                    <Input
                        placeholder="e.g. Structural, Finishing"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Initial Quantity</label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-1">Unit Type</label>
                        <Input
                            placeholder="e.g. Pkgs, Ltrs, Units"
                            value={unitType}
                            onChange={(e) => setUnitType(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">Reorder Threshold</label>
                    <Input
                        type="number"
                        placeholder="5"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        required
                    />
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">System will alert you when stock falls below this level.</p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8">Add Product</Button>
                </div>
            </form>
        </Modal>
    );
}
