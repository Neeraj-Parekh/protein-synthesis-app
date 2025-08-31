class WeatherMonitor:
    def __init__(self, location):
        self.location = location
        self.temperature = 0.0  # in Celsius
        self.humidity = 0.0     # in percentage
        self.pressure = 0.0     # in hPa

    def update_weather(self, temp, hum, pres):
        self.temperature = temp
        self.humidity = hum
        self.pressure = pres
        print(f"Weather updated for {self.location}: Temp={self.temperature}°C, Humidity={self.humidity}%, Pressure={self.pressure}hPa")

    def display_weather(self):
        print(f"Current weather in {self.location}:")
        print(f"Temperature: {self.temperature}°C")
        print(f"Humidity: {self.humidity}%")
        print(f"Pressure: {self.pressure} hPa")

# User-defined function outside the class
def calculate_average_temperature(monitors):
    total_temp = sum(monitor.temperature for monitor in monitors)
    average = total_temp / len(monitors) if monitors else 0
    return average

# Creating objects
monitor1 = WeatherMonitor("New York")
monitor2 = WeatherMonitor("London")

# Updating weather data
monitor1.update_weather(25.5, 60.0, 1013.2)
monitor2.update_weather(18.0, 75.0, 1008.5)

# Displaying weather
monitor1.display_weather()
monitor2.display_weather()

# Using user-defined function
monitors = [monitor1, monitor2]
avg_temp = calculate_average_temperature(monitors)
print(f"Average temperature across locations: {avg_temp}°C")
