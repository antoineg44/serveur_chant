<?php
// Configuration
$sourceDirectory = '../../www/pdf';  // Le dossier à sauvegarder
$backupDirectory = '../../backup';  // L'emplacement où sauvegarder
$date = date('Y-m-d_H-i-s');  // Date et heure pour rendre chaque sauvegarde unique
$backupPath = $backupDirectory . '/backup_' . $date;  // Nom du dossier de sauvegarde
$maxWeeklyBackups = 3; // Nombre maximum de sauvegardes à conserver par semaine
$maxMonthlyBackups = 5; // Nombre maximum de sauvegardes à conserver par mois
$maxYearlyBackups = 3; // Nombre maximum de sauvegardes à conserver par année

// Créer le dossier de sauvegarde si nécessaire
if (!file_exists($backupPath)) {
    mkdir($backupPath, 0777, true);
}

// Fonction de copie des fichiers et sous-dossiers
function copyDirectory($source, $destination)
{
    $directory = opendir($source);

    // Crée le dossier destination s'il n'existe pas
    if (!file_exists($destination)) {
        mkdir($destination, 0777, true);
    }

    // Copier les fichiers et sous-dossiers
    while (($file = readdir($directory)) !== false) {
        if ($file != '.' && $file != '..') {
            $sourcePath = $source . '/' . $file;
            $destinationPath = $destination . '/' . $file;

            // Si c'est un répertoire, appel récursif
            if (is_dir($sourcePath)) {
                copyDirectory($sourcePath, $destinationPath);
            } else {
                // Si c'est un fichier, copie simple
                copy($sourcePath, $destinationPath);
            }
        }
    }

    closedir($directory);
}

// Sauvegarder le dossier
copyDirectory($sourceDirectory, $backupPath);

echo "Sauvegarde terminée avec succès ! Dossier de sauvegarde : " . $backupPath . "\n";

// Fonction pour gérer les sauvegardes
function manageBackups($backupDirectory, $maxWeeklyBackups, $maxMonthlyBackups, $maxYearlyBackups)
{
    // Liste des répertoires de sauvegarde existants
    $backups = [];
    $dir = opendir($backupDirectory);

    // Parcourir le dossier de sauvegarde pour récupérer les répertoires de sauvegarde
    while (($file = readdir($dir)) !== false) {
        if (strpos($file, 'backup_') === 0 && is_dir($backupDirectory . '/' . $file)) {
            $backups[] = $file;
        }
    }
    closedir($dir);

    // Trier les sauvegardes par ordre chronologique (les plus anciennes d'abord)
    sort($backups);

    // Séparer les sauvegardes par année, mois et semaine
    $weeklyBackups = [];
    $monthlyBackups = [];
    $yearlyBackups = [];

    foreach ($backups as $backup) {
        $backupDate = substr($backup, 7); // Extraire la date du nom du dossier (format Y-m-d_H-i-s)
        $year = substr($backupDate, 0, 4);
        $month = substr($backupDate, 5, 2);
        $week = date('W', strtotime($backupDate)); // Semaine de l'année

        $weeklyBackups[$year][$week][] = $backup;
        $monthlyBackups[$year][$month][] = $backup;
        $yearlyBackups[$year][] = $backup;
    }

    // Supprimer les sauvegardes excédentaires par semaine
    foreach ($weeklyBackups as $year => $weeks) {
        foreach ($weeks as $week => $weekBackups) {
            if (count($weekBackups) > $maxWeeklyBackups) {
                $excess = count($weekBackups) - $maxWeeklyBackups;
                for ($i = 0; $i < $excess; $i++) {
                    deleteDirectory($backupDirectory . '/' . array_shift($weekBackups));
                }
            }
        }
    }

    // Supprimer les sauvegardes excédentaires par mois
    foreach ($monthlyBackups as $year => $months) {
        foreach ($months as $month => $monthBackups) {
            if (count($monthBackups) > $maxMonthlyBackups) {
                $excess = count($monthBackups) - $maxMonthlyBackups;
                for ($i = 0; $i < $excess; $i++) {
                    deleteDirectory($backupDirectory . '/' . array_shift($monthBackups));
                }
            }
        }
    }

    // Supprimer les sauvegardes excédentaires par année
    foreach ($yearlyBackups as $year => $yearBackups) {
        if (count($yearBackups) > $maxYearlyBackups) {
            $excess = count($yearBackups) - $maxYearlyBackups;
            for ($i = 0; $i < $excess; $i++) {
                deleteDirectory($backupDirectory . '/' . array_shift($yearBackups));
            }
        }
    }
}

// Fonction pour supprimer un répertoire et son contenu
function deleteDirectory($dir)
{
    if (is_dir($dir)) {
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            $filePath = $dir . '/' . $file;
            is_dir($filePath) ? deleteDirectory($filePath) : unlink($filePath);
        }
        rmdir($dir);
    }
}

// Gérer les sauvegardes
manageBackups($backupDirectory, $maxWeeklyBackups, $maxMonthlyBackups, $maxYearlyBackups);
?>
