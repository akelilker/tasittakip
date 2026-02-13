# Taşıt Takip - karmotors.com.tr
FROM php:8.2-apache

# mod_rewrite ve headers etkin
RUN a2enmod rewrite headers

# .htaccess çalışsın
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

EXPOSE 80
