<?php
/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Enterprise License (PEL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @category   Pimcore
 * @package    Object
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */

namespace Pimcore\Model\DataObject\ImportColumnConfig\Operator;

use Pimcore\Model\DataObject\Concrete;
use Pimcore\Model\DataObject\ImportColumnConfig\AbstractConfigElement;

class Unserialize extends AbstractOperator
{
    /**
     * @param $element Concrete
     * @param $target
     * @param $rowData
     * @param $rowIndex
     *
     * @return null|\stdClass
     */
    public function process($element, &$target, &$rowData, $colIndex, &$context = [])
    {
        $originalCellData = $rowData[$colIndex];
        $celldata = unserialize($rowData[$colIndex]);
        $rowData[$colIndex] = $celldata;

        $childs = $this->getChilds();

        if (!$childs) {
            return;
        } else {
            /** @var $child AbstractConfigElement */
            for ($i = 0; $i < count($childs); $i++) {
                $child = $childs[$i];
                $child->process($element, $target, $rowData, $colIndex, $context);
            }
        }

        $rowData[$colIndex] = $originalCellData;
    }
}
