<?php
// Redirect to the HTML installation guides
$availableGuides = [
    'installation_local.html' => 'Local Installation Guide',
    'installation_aws.html' => 'AWS Deployment Guide',
    'installation_cpanel.html' => 'cPanel Installation Guide',
    'architecture.html' => 'System Architecture',
    'postgresql_to_mysql_migration.html' => 'PostgreSQL to MySQL Migration Guide',
    'testtutorial.html' => 'CVTransform Tutorial'
];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVTransform - Documentation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .documentation-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .documentation-item {
            background: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        .documentation-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .documentation-item h3 {
            margin-top: 0;
            color: #3498db;
        }
        .documentation-item p {
            margin-bottom: 15px;
            color: #666;
        }
        .btn {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.3s ease;
        }
        .btn:hover {
            background: #2980b9;
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
            margin-right: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">CVTransform</div>
        <h1>Documentation & Guides</h1>
    </div>
    
    <p>Welcome to the CVTransform documentation. Here you'll find comprehensive guides and documentation to help you get started with CVTransform as quickly as possible.</p>
    
    <div class="documentation-list">
        <?php foreach ($availableGuides as $file => $title): ?>
            <div class="documentation-item">
                <h3><?php echo htmlspecialchars($title); ?></h3>
                <p>
                    <?php
                    switch ($file) {
                        case 'installation_local.html':
                            echo 'Learn how to set up CVTransform on your local machine for development and testing.';
                            break;
                        case 'installation_aws.html':
                            echo 'Deploy CVTransform to AWS for a scalable, production-ready environment.';
                            break;
                        case 'installation_cpanel.html':
                            echo 'Step-by-step instructions for installing CVTransform on cPanel hosting environments.';
                            break;
                        case 'architecture.html':
                            echo 'Understand the system architecture of CVTransform, including components and data flow.';
                            break;
                        case 'postgresql_to_mysql_migration.html':
                            echo 'Guide for migrating your CVTransform database from PostgreSQL to MySQL.';
                            break;
                        case 'testtutorial.html':
                            echo 'Tutorial on how to use CVTransform to optimize your CV for job applications.';
                            break;
                        default:
                            echo 'Documentation for CVTransform functionality and features.';
                    }
                    ?>
                </p>
                <a href="<?php echo htmlspecialchars($file); ?>" class="btn">View Guide</a>
            </div>
        <?php endforeach; ?>
    </div>
</body>
</html>