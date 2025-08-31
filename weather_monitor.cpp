// Author: Neeraj Parekh
#include <iostream>
#include <string>
#include <vector>

using namespace std;

class WeatherMonitor {
private:
    string location;
    double temperature;
    double humidity;
    double pressure;

public:
    WeatherMonitor(string loc) {
        location = loc;
        temperature = 0.0;
        humidity = 0.0;
        pressure = 0.0;
    }

    void update_weather(double temp, double hum, double pres) {
        temperature = temp;
        humidity = hum;
        pressure = pres;
        cout << "Weather updated for " << location << ": Temp=" << temperature << "°C, Humidity=" << humidity << "%, Pressure=" << pressure << "hPa" << endl;
    }

    void display_weather() {
        cout << "Current weather in " << location << ":" << endl;
        cout << "Temperature: " << temperature << "°C" << endl;
        cout << "Humidity: " << humidity << "%" << endl;
        cout << "Pressure: " << pressure << " hPa" << endl;
    }

    double get_temperature() {
        return temperature;
    }
};

// User-defined function
double calculate_average_temperature(vector<WeatherMonitor>& monitors) {
    double total = 0.0;
    for (auto& monitor : monitors) {
        total += monitor.get_temperature();
    }
    return total / monitors.size();
}

int main() {
    WeatherMonitor monitor1("New York");
    WeatherMonitor monitor2("London");

    monitor1.update_weather(25.5, 60.0, 1013.2);
    monitor2.update_weather(18.0, 75.0, 1008.5);

    monitor1.display_weather();
    monitor2.display_weather();

    vector<WeatherMonitor> monitors = {monitor1, monitor2};
    double avg_temp = calculate_average_temperature(monitors);
    cout << "Average temperature across locations: " << avg_temp << "°C" << endl;

    return 0;
}
