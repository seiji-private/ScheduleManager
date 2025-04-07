package com.practice.scheduleManager.service;

import com.practice.scheduleManager.model.Event;
import com.practice.scheduleManager.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;

    public List<Event> getEvents(LocalDate start, LocalDate end) {
        return eventRepository.findByStartBetween(start, end);
    }

    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }
}