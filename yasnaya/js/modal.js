(function () {
  // открытие по кнопкам с data-modal="id окна"
  document.querySelectorAll('[data-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dialog = document.getElementById(btn.dataset.modal);
      if (dialog && dialog.showModal) dialog.showModal();
    });
  });

  // закрытие: крестик, кнопка с data-close и клик вне окна
  document.querySelectorAll('dialog.modal').forEach(function (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
  });
})();