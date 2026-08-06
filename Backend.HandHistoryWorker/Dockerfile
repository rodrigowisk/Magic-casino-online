# 1. Estágio de Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Backend.HandHistoryWorker/Backend.HandHistoryWorker.csproj", "Backend.HandHistoryWorker/"]
RUN dotnet restore "Backend.HandHistoryWorker/Backend.HandHistoryWorker.csproj"
COPY ["Backend.HandHistoryWorker/", "Backend.HandHistoryWorker/"]
WORKDIR "/src/Backend.HandHistoryWorker"
RUN dotnet build "Backend.HandHistoryWorker.csproj" -c Release -o /app/build
RUN dotnet publish "Backend.HandHistoryWorker.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Estágio de Execução (runtime puro — não precisa do ASP.NET Core, esse worker não serve HTTP)
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Backend.HandHistoryWorker.dll"]