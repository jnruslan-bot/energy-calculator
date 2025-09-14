@echo off
cd /d "%USERPROFILE%\Desktop\energy-calculator"

:: Устанавливаем зависимости (только если их нет)
if not exist "node_modules" (
  echo [INFO] Устанавливаю зависимости...
  call npm install
)

:: Запускаем dev-сервер в отдельном окне
start "EnergyCalc Dev" cmd /k "npm run dev"

:: Даём серверу время запуститься (3 секунды)
ping 127.0.0.1 -n 4 >nul

:: Автоматически открываем калькулятор в браузере
start http://localhost:5173/

pause
