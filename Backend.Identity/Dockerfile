# 1. Estágio Base: Imagem leve apenas com o runtime para rodar o app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# 2. Estágio de Build: Imagem pesada com SDK para compilar o código
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copia apenas o arquivo de projeto primeiro (ajuda no cache do Docker)
COPY ["Backend.Identity/Backend.Identity.csproj", "Backend.Identity/"]
RUN dotnet restore "Backend.Identity/Backend.Identity.csproj"

# Copia o restante do código e compila
COPY ["Backend.Identity/", "Backend.Identity/"]
WORKDIR "/src/Backend.Identity"
RUN dotnet build "Backend.Identity.csproj" -c Release -o /app/build

# 3. Estágio de Publicação: Otimiza os arquivos para produção
FROM build AS publish
RUN dotnet publish "Backend.Identity.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 4. Estágio Final: Pega os arquivos publicados e coloca na imagem leve
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Backend.Identity.dll"]