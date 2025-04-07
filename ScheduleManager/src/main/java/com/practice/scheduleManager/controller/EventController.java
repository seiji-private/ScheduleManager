package com.practice.scheduleManager.controller;

import com.practice.scheduleManager.model.Event;
import com.practice.scheduleManager.repository.EventRepository;
import lombok.AllArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@AllArgsConstructor
public class EventController {
    private final EventRepository eventRepository;

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody Event event) {
        try {
            Event savedEvent = eventRepository.save(event);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedEvent);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid request: " + e.getMessage());
        }
    }

    @GetMapping
    public List<Event> getEvents(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Event> events;

        if (date != null) {
            events = eventRepository.findByDateRange(date);
        } else {
            events = eventRepository.findAll();
        }

        // FullCalendar の `end` は排他的なので、レスポンス時に +1日
        for (Event event : events) {
            if (event.getEnd() != null) {
                event.setEnd(event.getEnd().plusDays(1));
            }
        }
        return events;
    }

    /*** 特定のイベントの詳細を取得 ***/
    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(event -> ResponseEntity.ok().body(event))
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT メソッド: イベントの更新
    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) throws Exception {
        // IDに対応するイベントが存在するか確認
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new Exception("Event not found with id " + id));

        // 既存のイベントに新しい詳細をセット
        existingEvent.setTitle(eventDetails.getTitle());
        existingEvent.setStart(eventDetails.getStart());
        existingEvent.setEnd(eventDetails.getEnd());
        existingEvent.setDescription(eventDetails.getDescription());
        existingEvent.setAssignee(eventDetails.getAssignee());

        // 更新されたイベントを保存
        Event updatedEvent = eventRepository.save(existingEvent);

        return ResponseEntity.ok(updatedEvent);  // 更新されたイベントをレスポンスとして返す
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        eventRepository.deleteById(id);
        return ResponseEntity.ok().build(); // 成功レスポンス
    }
}
