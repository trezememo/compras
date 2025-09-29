import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, Trash2 } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  bought: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORIES = [
  // Mercado
  "Hortifrúti",
  "Açougue", 
  "Laticínios",
  "Padaria",
  "Mercearia",
  "Bebidas",
  "Congelados",
  "Enlatados",
  // Utilidades
  "Limpeza",
  "Higiene",
  "Cozinha",
  "Casa",
  "Ferramentas",
  "Eletrônicos",
  "Farmácia",
  "Pet Shop",
  // Específicas
  "Bebê",
  "Escritório", 
  "Jardinagem",
  "Automotivo",
  "Outros"
];

export const ShoppingList = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial items
  useEffect(() => {
    fetchItems();
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('shopping_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [payload.new as ShoppingItem, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new as ShoppingItem : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens da lista.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItemName.trim() || !newItemCategory) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e a categoria do item.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_items')
        .insert([
          {
            name: newItemName.trim(),
            category: newItemCategory,
            bought: false
          }
        ]);

      if (error) throw error;

      setNewItemName("");
      setNewItemCategory("");
      
      toast({
        title: "Item adicionado",
        description: "Item adicionado à lista com sucesso!",
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item.",
        variant: "destructive",
      });
    }
  };

  const toggleItem = async (id: string, bought: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ bought: !bought })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Item removido",
        description: "Item removido da lista com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o item.",
        variant: "destructive",
      });
    }
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-background to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando lista...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-purple-950 via-background to-purple-900/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
            🛒 Lista de Compras
          </h1>
          <p className="text-muted-foreground">Lista colaborativa em tempo real</p>
        </div>

        {/* Add Item Form */}
        <Card className="mb-8 shadow-2xl border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-purple-800/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Adicionar Novo Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Nome do item"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-purple-500/30 focus:border-purple-400 bg-purple-950/50 text-white placeholder:text-purple-300"
              />
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger className="w-full sm:w-48 border-purple-500/30 focus:border-purple-400 bg-purple-950/50 text-white">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-purple-900 border-purple-500/30">
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category} className="text-white hover:bg-purple-800 focus:bg-purple-800">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={addItem}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shopping List */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category} className="shadow-xl border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-purple-800/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group flex items-center space-x-4 p-4 rounded-lg border transition-all duration-300 hover:shadow-lg ${
                        item.bought 
                          ? 'bg-purple-900/20 border-purple-500/30 opacity-70' 
                          : 'bg-purple-950/30 border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-900/40'
                      }`}
                    >
                      <Checkbox
                        checked={item.bought}
                        onCheckedChange={() => toggleItem(item.id, item.bought)}
                        className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 transition-all duration-200"
                      />
                      <span
                        className={`flex-1 transition-all duration-300 ${
                          item.bought 
                            ? 'line-through text-purple-300' 
                            : 'text-foreground group-hover:text-purple-300'
                        }`}
                      >
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.bought && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <Card className="shadow-xl border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-purple-800/10 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4 animate-pulse">🛒</div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Lista vazia</h3>
              <p className="text-muted-foreground">
                Adicione alguns itens para começar sua lista de compras!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};