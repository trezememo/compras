-- Create shopping_items table
CREATE TABLE public.shopping_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    bought BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (collaborative app)
CREATE POLICY "Anyone can view shopping items" 
ON public.shopping_items 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert shopping items" 
ON public.shopping_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update shopping items" 
ON public.shopping_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete shopping items" 
ON public.shopping_items 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shopping_items_updated_at
    BEFORE UPDATE ON public.shopping_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER TABLE public.shopping_items REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.shopping_items;