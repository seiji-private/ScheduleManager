document.addEventListener('DOMContentLoaded', function () {
    let currentPopover = null;
    let tempEventInstance = null;
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        eventContent: function(arg) {
            let allEvents = arg.view.calendar.getEvents();
            let event = arg.event;

            // イベントの開始日と終了日を取得
            let startDate = new Date(event.startStr);
            let endDate = event.end ? new Date(event.end) : new Date(event.startStr);

            // 指定された期間内にあるイベントを取得
            let events = arg.view.calendar.getEvents().filter(e => {
                let eStart = new Date(e.startStr);
                let eEnd = e.end ? new Date(e.end) : new Date(e.startStr);

                return !(eEnd < startDate || eStart > endDate); // 期間内のイベントをフィルタリング
            });

            // イベントをソート（order → 開始時間 → タイトル順（アルファベット順））
            events.sort((a, b) => {
                // order（小さい方が上に）
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                // 開始時間順（早い方が上に）
                const startA = new Date(a.startStr || a.start);
                const startB = new Date(b.startStr || b.start);
                if (startA.getTime() !== startB.getTime()) {
                    return startA - startB;
                }

                // タイトルのアルファベット順（辞書順）
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });

            // 表示ロジック
            // more-events をリストの最後に追加するための処理
            let index = events.findIndex(e => e.id === event.id);
            if (index < 2) {
                return { html: `<div class="event-item">${event.title}</div>` };
            }
            else if (index === 2) {  // 3件目のイベントで "他n件" を表示
                let remaining = events.length - 2;
                if (remaining > 0) {
                    return { html: `<div class="more-events event-item" data-date="${event.startStr}">
                        他${remaining}件
                    </div>` };
                }
            }

            return false;  // 4件目以降のイベントは非表示
        },
        initialView: 'dayGridMonth',
        locale: 'ja',
        height: '100%',
        editable: true,
        eventOrder: "order,start,title" ,
        droppable: true,
        headerToolbar: {
            left: 'customPrev,customNext,title',
            center: '',
            right: ''
        },
        customButtons: {
            customPrev: {
              text: '', // テキストを消す
              icon: '', // デフォルトのアイコンも消す
              click: function () {
                calendar.prev(); // 前の月へ
              }
            },
            customNext: {
              text: '',
              icon: '',
              click: function () {
                calendar.next(); // 次の月へ
              }
            }
        },
        datesSet: function () {
            const prevBtn = document.querySelector('.fc-customPrev-button');
            const nextBtn = document.querySelector('.fc-customNext-button');

            if (prevBtn && !prevBtn.querySelector('img')) {
              prevBtn.innerHTML = '<img src="/images/prev-arrow.png" alt="prev" style="height: 20px;">';
            }

            if (nextBtn && !nextBtn.querySelector('img')) {
              nextBtn.innerHTML = '<img src="/images/next-arrow.png" alt="next" style="height: 20px;">';
            }
        },
        dayCellContent: function(info) {
            // ここで info.dayNumberText から「日」を除いた値を設定
            return { html: info.date.getDate().toString() };
        },
        dayCellDidMount: function(info) {

            // 現在の日付をローカルの「年月日」だけで取得
            const today = new Date();
            const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

            const cellDate = info.date;
            const cellDateStr = cellDate.getFullYear() + '-' + String(cellDate.getMonth() + 1).padStart(2, '0') + '-' + String(cellDate.getDate()).padStart(2, '0');

            if (cellDateStr === todayStr) {
                // 背景を白にしてデフォルトのハイライトを無効化
                info.el.style.backgroundColor = '#ffffff';

                // 日付数字（.fc-daygrid-day-number）を取得して装飾
                const dayText = info.el.querySelector('.fc-daygrid-day-number');
                if (dayText) {
                    dayText.style.color = '#ffffff';
                    dayText.style.backgroundColor = '#2C61F4';
                    // 丸くなるように調整
                    dayText.style.borderRadius = '50%';
                    dayText.style.padding = '6px 12px';  // 上下左右に適切な余白を追加
                    dayText.style.height = '30px';  // 高さを指定
                    dayText.style.width = '30px';   // 幅を指定
                    dayText.style.display = 'flex'; // フレックスボックスにして内容を中央に配置
                    dayText.style.justifyContent = 'center'; // 水平中央
                    dayText.style.alignItems = 'center'; // 垂直中央
                }
            }
        },
        dateClick: function (info) {
            // 他のポップオーバーが開いていれば閉じる
            if (currentPopover) {
                currentPopover.hide();
                currentPopover = null;
            }

            // 既存の一時イベントがあれば削除
            if (tempEventInstance) {
                tempEventInstance.remove();
                tempEventInstance = null;
            }

            // テンプレートからform要素を複製
            const template = document.getElementById('eventFormTemplate');
            const formClone = template.querySelector('form').cloneNode(true);

            // 開始日・終了日をセット
            formClone.querySelector('[name="startDate"]').value = info.dateStr;
            formClone.querySelector('[name="endDate"]').value = info.dateStr;

            // 空のイベントデータを一時的に表示
            formClone.querySelector('[name="title"]').value = ''; // タイトルは空
            formClone.querySelector('[name="description"]').value = ''; // 詳細は空
            formClone.querySelector('[name="assignee"]').value = ''; // 担当者は空

            const tempEventTitle = '(タイトルなし)';

            // 空のイベントデータを一時的にカレンダーに追加
                var tempEvent = {
                    title: tempEventTitle,
                    start: info.dateStr,
                    end: info.dateStr,
                    description: '',
                    assignee: '',
                    display: 'block',
                    order: -9999
                };

            // 新しいイベントをカレンダーに追加
            tempEventInstance = calendar.addEvent(tempEvent);

            // ポップオーバー生成
            const popover = new bootstrap.Popover(info.dayEl, {
                html: true,
                content: formClone,
                trigger: 'manual',
                placement: 'auto',
                sanitize: false
            });

            popover.show();
            currentPopover = popover;

            // フォーム送信イベント
            formClone.addEventListener('submit', function (e) {
                e.preventDefault(); // フォーム送信のデフォルト動作をキャンセル

                // フォームデータの取得
                const title = formClone.querySelector('[name="title"]').value;
                const startDate = formClone.querySelector('[name="startDate"]').value;
                const endDate = formClone.querySelector('[name="endDate"]').value;
                const description = formClone.querySelector('[name="description"]').value;
                const assignee = formClone.querySelector('[name="assignee"]').value;

                // イベントデータを作成
                var newEvent = {
                    title: title || '新規イベント', // タイトルが空の場合はデフォルトタイトル
                    start: startDate,
                    end: endDate,
                    description: description,
                    assignee: assignee
                };

                // 一時イベントを削除
                if (tempEventInstance) {
                    tempEventInstance.remove();
                    tempEventInstance = null;
                }

                // サーバーへの保存
                fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEvent)
                }).then(response => {
                    if (response.ok) {
                        console.log('イベントが正常に保存されました');
                        // イベント保存後の処理
                        location.reload(); // 画面をリロードして更新を反映
                    } else {
                        console.error('イベントの保存に失敗しました');
                    }
                }).catch(error => {
                    console.error('保存時のエラー:', error);
                });

                // ポップオーバーを閉じる
                popover.hide();
                currentPopover = null;
            });

            // 閉じるボタンイベント
            formClone.querySelector('.btn-close-popover').addEventListener('click', function () {
                currentPopover?.hide();
                currentPopover = null;

                // ポップオーバーを閉じる際に、一時的なイベントも削除
                if (tempEventInstance) {
                    tempEventInstance.remove();
                    tempEventInstance = null;
                }
            });
        },
        eventClick: function (info) {
            // 他のポップオーバーが開いていれば閉じる
            if (currentPopover) {
                currentPopover.hide();
                currentPopover = null;
            }
            var event = info.event;

            // "more-events" のクリックは無視
            if (info.el.firstChild?.firstChild?.classList?.contains('more-events')) {
                return;
            }

            // 既存のポップオーバーを閉じる
            bootstrap.Popover.getInstance(info.el)?.dispose();

            // フォームテンプレートから複製
            const template = document.getElementById('eventFormTemplate');
            const formClone = template.querySelector('form').cloneNode(true);

            // 値をセット
            formClone.querySelector('[name="scheduleId"]').value = event.id;
            formClone.querySelector('[name="startDate"]').value = event.startStr;
            formClone.querySelector('[name="endDate"]').value =
                event.end ? new Date(event.end).toISOString().split("T")[0] : event.startStr;
            formClone.querySelector('[name="title"]').value = event.title;
            formClone.querySelector('[name="description"]').value = event.extendedProps.description || "";
            formClone.querySelector('[name="assignee"]').value = event.extendedProps.assignee || "";

            // 削除ボタンを表示
            formClone.querySelector('#deleteEventBtn').classList.remove('d-none');

            // ポップオーバー表示
            const popover = new bootstrap.Popover(info.el, {
                html: true,
                content: formClone,
                trigger: 'manual',
                placement: 'auto',
                sanitize: false
            });
            popover.show();
            currentPopover = popover;

            // フォーム送信時の処理
            formClone.addEventListener('submit', function (e) {
                e.preventDefault();

                // 更新されたデータを取得
                const updatedEvent = {
                    id: formClone.querySelector('[name="scheduleId"]').value,
                    title: formClone.querySelector('[name="title"]').value,
                    start: formClone.querySelector('[name="startDate"]').value,
                    end: formClone.querySelector('[name="endDate"]').value,
                    description: formClone.querySelector('[name="description"]').value,
                    assignee: formClone.querySelector('[name="assignee"]').value
                };

                let startDate = updatedEvent.start ? new Date(updatedEvent.start) : null;
                let endDate = updatedEvent.end ? new Date(updatedEvent.end) : null;

                // FullCalendar上のイベントを更新
                event.setProp('title', updatedEvent.title);
                event.setStart(startDate);
                event.setEnd(endDate);
                event.setExtendedProp('description', updatedEvent.description);
                event.setExtendedProp('assignee', updatedEvent.assignee);

                // サーバーに保存
                fetch(`/api/events/${updatedEvent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedEvent)
                }).then(response => {
                    if (response.ok) {
                        console.log("イベントが更新されました");
                        calendar.refetchEvents();
                    } else {
                        console.error("更新に失敗しました");
                    }
                }).catch(error => {
                    console.error("通信エラー:", error);
                });

                // ポップオーバーを閉じる
                popover.hide();
                currentPopover = null;
            });

            // 削除ボタン処理
            formClone.querySelector('#deleteEventBtn').addEventListener('click', function () {
                fetch(`/api/events/${event.id}`, {
                    method: 'DELETE'
                }).then(response => {
                    if (response.ok) {
                        event.remove(); // カレンダーから削除
                        popover.hide(); // ポップオーバーを閉じる
                        currentPopover = null;
                        console.log("削除されました");
                    } else {
                        console.error("削除に失敗しました");
                    }
                }).catch(error => {
                    console.error("通信エラー:", error);
                });
            });

            // 閉じるボタン
            const closeBtn = formClone.querySelector('.btn-close-popover');
            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    popover.hide();
                    currentPopover = null;
                });
            }
        },
        eventDidMount: function(info) {
            let eventElement = info.el;
            if (eventElement.querySelector(".more-events")) {
                eventElement.classList.remove("fc-event-draggable");
            }
        },
        eventDrop: function (info) {
            var event = info.event;

            var updatedEvent = {
                title: event.title,
                start: event.startStr,
                end: event.end ? new Date(event.end).toISOString().split("T")[0] : event.startStr, // endをセット
                description: event.extendedProps.description || "",
                assignee: event.extendedProps.assignee || ""
            };

            fetch("/api/events/" + event.id, {
                method: "PUT",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEvent)
            }).then(response => {
                if (!response.ok) {
                    throw new Error("スケジュールの更新に失敗しました");
                }
            }).catch(error => {
                console.error("エラー:", error);
                info.revert();
            });
        },
        events: '/api/events'
    });
    calendar.render();

    // イベントフォームの送信
    document.getElementById('eventFormTemplate').addEventListener('submit', function (event) {
        event.preventDefault();

        var scheduleId = document.getElementById('scheduleId').value;
        var title = document.getElementById('eventTitle').value;
        var startDate = document.getElementById('startDate').value;
        var endDate = document.getElementById('endDate').value;

        // end を +1日する（排他処理の調整）
        let adjustedEndDate = new Date(endDate);
        let formattedEndDate = adjustedEndDate.toISOString().split("T")[0];

        var newEvent = {
            title: title,
            start: startDate,
            end: formattedEndDate, // end を調整
            description: document.getElementById('description').value,
            assignee: document.getElementById('assignee').value
        };

        var method = scheduleId === '' ? "POST" : "PUT";
        var url = scheduleId === '' ? "/api/events" : "/api/events/" + scheduleId;

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
        }).then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error("スケジュールの保存に失敗しました");
            }
        }).then(data => {
            console.log("スケジュール保存成功:", data);
            location.reload();
        }).catch(error => {
            console.error("エラー:", error);
        });

        document.getElementById('deleteEventBtn').classList.add('d-none');
    });

    // 削除ボタン
    document.getElementById('deleteEventBtn').addEventListener('click', function () {
        var scheduleId = document.getElementById('scheduleId').value;
        if (scheduleId === '') return;

        fetch("/api/events/" + scheduleId, {
            method: "DELETE"
        }).then(response => {
            if (response.ok) {
                location.reload();
            } else {
                console.error("イベントの削除に失敗しました");
            }
        }).catch(error => {
            console.error("削除エラー:", error);
        });

        document.getElementById('deleteEventBtn').classList.add('d-none');
    });

    // 「他n件」のクリックでイベント一覧表示
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('more-events')) {
            let date = e.target.getAttribute('data-date');
            showEventModal(date);
        }
    });

    function showEventModal(date) {
        // 日付から曜日を計算
        const eventDate = new Date(date);
        const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];
        const weekday = weekdayNames[eventDate.getDay()];

        // モーダルヘッダーに日付と曜日を表示
        const modalHeader = document.querySelector('#eventListModalDateArea');
        modalHeader.innerHTML = `${weekday}<br>${eventDate.getDate()}`;
        fetch('/api/events?date=' + date)
            .then(response => response.json())
            .then(events => {
                let modalBody = document.getElementById('eventListModalBody');
                modalBody.innerHTML = events.map(event => `
                  <div class="fc-event fc-h-event fc-daygrid-event fc-daygrid-block-event cursor-pointer">
                    <div class="fc-event-main">
                        <div class="event-item event-list-item" data-id="${event.id}">
                            ${event.title}
                        </div>
                    </div>
                  </div>
                `).join('');
                let modal = new bootstrap.Modal(document.getElementById('eventListModal'));
                modal.show();
            });
    }

    // 一覧のイベントタイトルクリックでイベント編集ポップオーバーを開く
    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains('event-list-item')) {
            let eventId = e.target.getAttribute('data-id');

            // 一覧モーダルを閉じる
            closeEventListModal();

            // すでに表示されているポップオーバーを閉じる
            if (currentPopover) {
                currentPopover.hide();
                currentPopover = null;
            }

            try {
                // APIからイベント詳細を取得
                const response = await fetch(`/api/events/${eventId}`);
                const event = await response.json();
                console.log("取得したイベントデータ:", event);

                // 編集用フォームをクローンして埋める
                const formTemplate = document.getElementById('eventFormTemplate');
                const formClone = formTemplate.querySelector('form').cloneNode(true);

                formClone.querySelector('[name="scheduleId"]').value = event.id;
                formClone.querySelector('[name="startDate"]').value =
                    event.start ? new Date(event.start).toISOString().split("T")[0] : event.startStr;
                formClone.querySelector('[name="endDate"]').value =
                    event.end ? new Date(event.end).toISOString().split("T")[0] : event.startStr;
                formClone.querySelector('[name="title"]').value = event.title;
                formClone.querySelector('[name="description"]').value = event.description || "";
                formClone.querySelector('[name="assignee"]').value = event.assignee || "";

                // 削除ボタン表示と即削除機能
                formClone.querySelector('#deleteEventBtn').classList.remove('d-none');
                formClone.querySelector('#deleteEventBtn').addEventListener('click', function () {
                    fetch(`/api/events/${event.id}`, { method: 'DELETE' })
                        .then(res => {
                            if (res.ok) {
                                calendar.getEventById(event.id)?.remove();
                                popover.hide();
                                currentPopover = null;
                            }
                        });
                });

                // フォーム送信イベント
                formClone.addEventListener('submit', function (submitEvent) {
                    submitEvent.preventDefault();

                    const updatedEvent = {
                        id: formClone.querySelector('[name="scheduleId"]').value,
                        title: formClone.querySelector('[name="title"]').value,
                        start: formClone.querySelector('[name="startDate"]').value,
                        end: formClone.querySelector('[name="endDate"]').value,
                        description: formClone.querySelector('[name="description"]').value,
                        assignee: formClone.querySelector('[name="assignee"]').value
                    };

                    // イベント更新のためのPUTリクエスト
                    fetch(`/api/events/${event.id}`, {
                        method: 'PUT', // 更新なのでPUTメソッドを使用
                         headers: {
                            'Content-Type': 'application/json', // JSON形式のデータ
                        },
                        body: JSON.stringify(updatedEvent) // JSON文字列化して送信
                    }).then(res => {
                        if (res.ok) {
                            // 更新が成功したらpopoverを閉じ、カレンダーをリフレッシュ
                            popover.hide();
                            currentPopover = null;
                            calendar.refetchEvents(); // これにより更新されたイベントがカレンダーに反映されます
                        }
                    }).catch(error => {
                        console.error('イベント更新エラー:', error);
                    });
                });

                // 閉じるボタン
                const closeBtn = formClone.querySelector('.btn-close-popover');
                if (closeBtn) {
                    closeBtn.addEventListener('click', function () {
                        popover.hide();
                        currentPopover = null;
                    });
                }

                // ポップオーバーの中身をDOMに追加して表示
                const popoverContent = document.createElement('div');
                popoverContent.appendChild(formClone);

                const popover = new bootstrap.Popover(e.target, {
                    title: 'イベント編集',
                    content: popoverContent,
                    html: true,
                    trigger: 'manual',
                    placement: 'right',
                    container: 'body'
                });

                currentPopover = popover;
                popover.show();

            } catch (error) {
                console.error("イベント取得失敗:", error);
            }
        }
    });

    // イベント一覧モーダルを閉じる関数
    function closeEventListModal() {
        let modal = bootstrap.Modal.getInstance(eventListModal);
        if (modal) {
            modal.hide();
        }
    }
});
