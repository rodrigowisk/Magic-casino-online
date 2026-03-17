# 1. Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Backend.Game/Backend.Game.csproj", "Backend.Game/"]
RUN dotnet restore "Backend.Game/Backend.Game.csproj"
COPY ["Backend.Game/", "Backend.Game/"]
WORKDIR "/src/Backend.Game"
RUN dotnet build "Backend.Game.csproj" -c Release -o /app/build
RUN dotnet publish "Backend.Game.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Estágio de Execução
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Backend.Game.dll"]