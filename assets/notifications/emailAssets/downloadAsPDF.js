function downloadPdf() {
      var doc = new jsPDF();
      doc.fromHTML(document.body);
      // Save the PDF
      doc.save('document.pdf');
}