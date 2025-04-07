package com.practice.scheduleManager.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CalenderController {
    @GetMapping("/calendar")
    public String showCalendar() {
        return "main"; // Thymeleaf の calendar.html を表示
    }
}
