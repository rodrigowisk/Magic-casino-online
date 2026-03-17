# 1. Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Backend.Cacheta/Backend.Cacheta.csproj", "Backend.Cacheta/"]
RUN dotnet restore "Backend.Cacheta/Backend.Cacheta.csproj"
COPY ["Backend.Cacheta/", "Backend.Cacheta/"]
WORKDIR "/src/Backend.Cacheta"
RUN dotnet build "Backend.Cacheta.csproj" -c Release -o /app/build
RUN dotnet publish "Backend.Cacheta.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Estágio de Execução
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Backend.Cacheta.dll"]