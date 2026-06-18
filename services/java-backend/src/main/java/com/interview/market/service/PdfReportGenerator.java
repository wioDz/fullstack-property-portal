package com.interview.market.service;

import com.interview.market.model.MarketStatistics;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;

/**
 * Helper class that generates a simple PDF report from market statistics.
 * Uses OpenPDF (com.lowagie) to avoid external dependencies on proprietary libraries.
 */
public class PdfReportGenerator {

    private static final Logger logger = LoggerFactory.getLogger(PdfReportGenerator.class);

    private PdfReportGenerator() {
        // Utility class, prevent instantiation.
    }

    /**
     * Build a PDF document containing the provided market statistics.
     *
     * @param stats market statistics
     * @return PDF file content as a byte array
     */
    public static byte[] generate(MarketStatistics stats) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();

            document.add(new Paragraph("Property Market Analysis Report"));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(2);
            table.addCell("Metric");
            table.addCell("Value");
            table.addCell("Property Count");
            table.addCell(String.valueOf(stats.getCount()));
            table.addCell("Average Price");
            table.addCell(String.format("$%,.2f", stats.getAveragePrice()));
            table.addCell("Median Price");
            table.addCell(String.format("$%,.2f", stats.getMedianPrice()));
            table.addCell("Min Price");
            table.addCell(String.format("$%,.2f", stats.getMinPrice()));
            table.addCell("Max Price");
            table.addCell(String.format("$%,.2f", stats.getMaxPrice()));
            table.addCell("Average Square Footage");
            table.addCell(String.format("%,.2f", stats.getAverageSquareFootage()));
            table.addCell("Average School Rating");
            table.addCell(String.format("%.2f", stats.getAverageSchoolRating()));

            document.add(table);
            document.close();

            return baos.toByteArray();
        } catch (DocumentException e) {
            logger.error("Failed to generate PDF report", e);
            throw new IllegalStateException("PDF generation failed", e);
        } catch (Exception e) {
            logger.error("Unexpected error during PDF generation", e);
            throw new IllegalStateException("PDF generation failed", e);
        }
    }
}
