import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Plus, Check, Trash2, ChevronDown, Search, ShoppingCart, Edit, X } from "lucide-react";

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantity?: number;
  bought: boolean;
  list_id: string;
  created_at?: string;
  updated_at?: string;
}

interface ShoppingList {
  id: string;
  name: string;
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
  // Estados para gerenciamento de listas
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  
  // Estados para itens da lista atual
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial lists
  useEffect(() => {
    fetchLists();
  }, []);

  // Fetch items when current list changes
  useEffect(() => {
    if (currentListId) {
      fetchItems();
    }
  }, [currentListId]);

  // Setup real-time subscription for lists
  useEffect(() => {
    const channel = supabase
      .channel('shopping_lists_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_lists'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLists(prev => [payload.new as ShoppingList, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLists(prev => prev.map(list => 
              list.id === payload.new.id ? payload.new as ShoppingList : list
            ));
          } else if (payload.eventType === 'DELETE') {
            setLists(prev => prev.filter(list => list.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Setup real-time subscription for items
  useEffect(() => {
    if (!currentListId) return;

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
  }, [currentListId]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as listas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!currentListId) return;

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', currentListId)
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
    }
  };

  const createList = async () => {
    if (!newListName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a lista.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ name: newListName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setNewListName("");
      setCurrentListId(data.id);
      
      toast({
        title: "Lista criada",
        description: "Lista criada com sucesso!",
      });
    } catch (error) {
      console.error('Error creating list:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a lista.",
        variant: "destructive",
      });
    }
  };

  const updateList = async (id: string) => {
    if (!editingListName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a lista.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ name: editingListName.trim() })
        .eq('id', id);

      if (error) throw error;

      setEditingListId(null);
      setEditingListName("");
      
      toast({
        title: "Lista atualizada",
        description: "Nome da lista atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating list:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a lista.",
        variant: "destructive",
      });
    }
  };

  const deleteList = async (id: string) => {
    try {
      // First delete all items in the list
      await supabase
        .from('shopping_items')
        .delete()
        .eq('list_id', id);

      // Then delete the list
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (currentListId === id) {
        setCurrentListId(null);
        setItems([]);
      }
      
      toast({
        title: "Lista removida",
        description: "Lista removida com sucesso!",
      });
    } catch (error) {
      console.error('Error deleting list:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a lista.",
        variant: "destructive",
      });
    }
  };

  const addItem = async () => {
    if (!newItemName.trim() || !newItemCategory || !currentListId) {
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
            quantity: newItemQuantity,
            list_id: currentListId,
            bought: false
          }
        ]);

      if (error) throw error;

      setNewItemName("");
      setNewItemCategory("");
      setNewItemQuantity(1);
      setCategoryOpen(false);
      setCategorySearch("");
      
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
      if (currentListId) {
        addItem();
      } else {
        createList();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há lista selecionada, mostrar seletor de listas
  if (!currentListId) {
    return (
      <div className="dark min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-900">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              🛒 Listas de Compras
            </h1>
            <p className="text-muted-foreground">Gerencie suas listas de compras</p>
          </div>

          {/* Create New List */}
          <Card className="mb-8 shadow-2xl border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-violet-400" />
                Criar Nova Lista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Nome da lista"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border-violet-500/30 focus:border-violet-400 bg-violet-950/50 text-white placeholder:text-violet-300"
                />
                <Button 
                  onClick={createList}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg hover:shadow-violet-500/25 transition-all duration-300 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Lista
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Card key={list.id} className="shadow-xl border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-6 h-6 text-violet-400" />
                      {editingListId === list.id ? (
                        <Input
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          className="flex-1 border-violet-500/30 focus:border-violet-400 bg-violet-950/50 text-white"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateList(list.id);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-foreground">{list.name}</h3>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingListId === list.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateList(list.id)}
                            className="bg-violet-500 hover:bg-violet-600 p-2 h-8 w-8"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingListId(null);
                              setEditingListName("");
                            }}
                            className="text-violet-400 hover:text-violet-300 p-2 h-8 w-8"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingListId(list.id);
                              setEditingListName(list.name);
                            }}
                            className="text-violet-400 hover:text-violet-300 p-2 h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteList(list.id)}
                            className="text-red-400 hover:text-red-300 p-2 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setCurrentListId(list.id)}
                    className="w-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/30 text-violet-300 hover:text-white transition-all duration-300"
                  >
                    Abrir Lista
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {lists.length === 0 && (
            <Card className="shadow-xl border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4 animate-pulse">🛒</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Nenhuma lista</h3>
                <p className="text-muted-foreground">
                  Crie sua primeira lista de compras para começar!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Se há lista selecionada, mostrar itens da lista
  const currentList = lists.find(list => list.id === currentListId);

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-fuchsia-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => setCurrentListId(null)}
              className="text-violet-400 hover:text-violet-300"
            >
              ← Voltar
            </Button>
            <h1 className="text-4xl font-bold text-foreground bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              {currentList?.name}
            </h1>
          </div>
          <p className="text-muted-foreground">Lista colaborativa em tempo real</p>
        </div>

        {/* Add Item Form */}
        <Card className="mb-8 shadow-2xl border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-400" />
              Adicionar Novo Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Nome do item"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border-violet-500/30 focus:border-violet-400 bg-violet-950/50 text-white placeholder:text-violet-300"
                />
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={newItemQuantity === 1 ? "" : newItemQuantity.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setNewItemQuantity(1);
                    } else {
                      const num = parseInt(value);
                      setNewItemQuantity(num > 0 ? num : 1);
                    }
                  }}
                  min="1"
                  className="w-20 border-violet-500/30 focus:border-violet-400 bg-violet-950/50 text-white placeholder:text-violet-300"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="flex-1 justify-between border-violet-500/30 focus:border-violet-400 bg-violet-950/50 text-white hover:bg-violet-900/50"
                    >
                      {newItemCategory || "Buscar categoria..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command className="bg-slate-50 border-slate-200">
                      <CommandInput 
                        placeholder="Digite para buscar..." 
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                        className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-500"
                      />
                      <CommandList className="max-h-[300px] bg-slate-50">
                        <CommandEmpty className="text-slate-600">Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup className="bg-slate-50">
                          {CATEGORIES
                            .filter(category => 
                              categorySearch === "" || category.toLowerCase().includes(categorySearch.toLowerCase())
                            )
                            .map((category) => (
                              <CommandItem
                                key={category}
                                value={category}
                                onSelect={(currentValue) => {
                                  setNewItemCategory(currentValue === newItemCategory ? "" : currentValue);
                                  setCategoryOpen(false);
                                  setCategorySearch("");
                                }}
                                className="text-slate-900 hover:bg-violet-100 focus:bg-violet-100 cursor-pointer bg-slate-50 data-[selected=true]:bg-violet-200"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    newItemCategory === category ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {category}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button 
                  onClick={addItem}
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 shadow-lg hover:shadow-violet-500/25 transition-all duration-300 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shopping List */}
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card key={category} className="shadow-xl border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
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
                          ? 'bg-violet-900/20 border-violet-500/30 opacity-70' 
                          : 'bg-violet-950/30 border-violet-500/20 hover:border-violet-400/50 hover:bg-violet-900/40'
                      }`}
                    >
                      <Checkbox
                        checked={item.bought}
                        onCheckedChange={() => toggleItem(item.id, item.bought)}
                        className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500 transition-all duration-200"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span
                          className={`transition-all duration-300 ${
                            item.bought 
                              ? 'line-through text-violet-300' 
                              : 'text-foreground group-hover:text-violet-300'
                          }`}
                        >
                          {item.name}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full">
                            {item.quantity}x
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.bought && (
                          <Check className="w-4 h-4 text-violet-400" />
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
          <Card className="shadow-xl border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/10 backdrop-blur-sm">
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