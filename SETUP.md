# Setup — Álbum Mundial 2026

App en React + Vite con Supabase para que vos y tus amigos carguen sus figuritas, vean su progreso y descubran quién tiene las repetidas que les faltan.

## 1. Crear proyecto en Supabase

1. Andá a https://supabase.com y creá un proyecto gratis.
2. En **Project Settings → API** copiá:
   - `Project URL` → va en `VITE_SUPABASE_URL`
   - `anon public key` → va en `VITE_SUPABASE_ANON_KEY`

## 2. Variables de entorno

En la raíz del proyecto creá un archivo `.env` (NO subir a git) con:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## 3. Crear las tablas

En Supabase abrí **SQL Editor** y pegá esto:

```sql
-- Perfil público (apodo visible para los amigos)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz default now()
);

-- Figuritas por usuario (cuántas tiene de cada una)
create table if not exists public.user_stickers (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sticker_code text not null,
  quantity int not null default 1 check (quantity >= 0),
  updated_at timestamptz default now(),
  unique (user_id, sticker_code)
);

-- RLS: cada quien edita lo suyo, pero todos pueden ver el resto
alter table public.profiles enable row level security;
alter table public.user_stickers enable row level security;

create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_insert_self"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update using (auth.uid() = id);

create policy "stickers_select_all"
  on public.user_stickers for select using (true);

create policy "stickers_modify_self"
  on public.user_stickers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 4. Authentication

En **Authentication → Sign In / Providers → Email**:
- Dejá habilitado **Email**.
- **Desactivá el toggle "Confirm email"** → así apenas se registran ya quedan logueados sin verificar mail.
- Guardá.

> Nota: para algo entre amigos esto está bien. Si algún día querés abrirlo más, conviene re-activarlo.

## 5. Correr la app

```
npm install
npm run dev
```

Abrí http://localhost:5173 y compartí el link con tus amigos cuando lo subas (por ejemplo a Vercel o Netlify).

## 6. Deploy (opcional)

- **Vercel**: importás el repo, agregás las dos variables `VITE_SUPABASE_*` en *Settings → Environment Variables* y listo.
- **Netlify**: mismo flujo, agregás las env vars en *Site settings → Environment variables*.

## Cómo funciona

- **Mi álbum**: lista de todas las figuritas. Sumás/restás con + / − . Si tenés 1 = "La tengo". Si tenés más de 1 = "+N repe".
- **Repetidas de amigos**: dos vistas — *Me sirven* (cruza tus faltantes con repetidas ajenas) y *Por amigo*.
- **Datos**: todo lo guarda Supabase. Los amigos solo pueden ver tus figuritas, no editarlas (RLS lo garantiza).
