# Usamos una imagen ligera de Node 18 Alpine
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias primero (mejora el cacheo)
COPY package*.json ./

# Instalamos solo las dependencias de producción (sin devDependencies)
RUN npm ci --only=production

# Copiamos el resto del código
COPY . .

# Creamos la carpeta uploads (Multer la necesita)
RUN mkdir -p uploads

# Exponemos el puerto que usará la API
EXPOSE 3000

# Comando de inicio
CMD ["node", "index.js"]