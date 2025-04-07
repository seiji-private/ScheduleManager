package com.practice.scheduleManager.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private LocalDate start;

    private LocalDate end;

    private String assignee;

    @Column(columnDefinition = "TEXT")
    private String description;
}
